-- ============================================
-- REVENUECAT WEBHOOK IDEMPOTENCY & SUBSCRIPTION HANDLING
-- ============================================

-- 1. CREATE WEBHOOK LOG TABLE (Idempotency)
CREATE TABLE IF NOT EXISTS public.revenuecat_webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL, -- RevenueCat event ID
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB,
    status TEXT DEFAULT 'processed' -- 'processed' | 'error' | 'duplicate'
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.revenuecat_webhook_log(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_user_id ON public.revenuecat_webhook_log(user_id);

-- 2. CREATE SUBSCRIPTION HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL, -- 'free', 'pro', 'growth', 'enterprise'
    driver_limit INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    revenue_cat_subscription_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscription_user_active ON public.subscription_history(user_id, is_active);

-- 3. FUNCTION: Process Webhook (Idempotent)
CREATE OR REPLACE FUNCTION public.process_revenuecat_webhook(
    p_event_id TEXT,
    p_event_type TEXT,
    p_user_id UUID,
    p_new_driver_limit INTEGER,
    p_payload JSONB
) RETURNS JSONB AS $$
DECLARE
    v_existing_event_id TEXT;
    v_current_limit INTEGER;
BEGIN
    -- ✅ IDEMPOTENCY CHECK
    SELECT event_id INTO v_existing_event_id
    FROM public.revenuecat_webhook_log
    WHERE event_id = p_event_id;

    IF v_existing_event_id IS NOT NULL THEN
        -- Event already processed, return early
        RETURN jsonb_build_object(
            'status', 'duplicate',
            'message', 'Event already processed',
            'event_id', p_event_id
        );
    END IF;

    -- Get current driver limit
    SELECT driver_limit INTO v_current_limit
    FROM public.users
    WHERE id = p_user_id;

    -- Log the webhook
    INSERT INTO public.revenuecat_webhook_log (event_id, event_type, user_id, payload, status)
    VALUES (p_event_id, p_event_type, p_user_id, p_payload, 'processed');

    -- Process based on event type
    IF p_event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION') THEN
        
        -- Update user's driver limit
        UPDATE public.users
        SET driver_limit = p_new_driver_limit,
            updated_at = NOW()
        WHERE id = p_user_id;

        -- Close previous subscription history record
        UPDATE public.subscription_history
        SET ended_at = NOW(),
            is_active = false
        WHERE user_id = p_user_id AND is_active = true;

        -- Create new subscription history record
        INSERT INTO public.subscription_history (user_id, driver_limit, tier_name)
        VALUES (
            p_user_id,
            p_new_driver_limit,
            CASE 
                WHEN p_new_driver_limit = 1 THEN 'free'
                WHEN p_new_driver_limit = 5 THEN 'pro'
                WHEN p_new_driver_limit = 10 THEN 'growth'
                WHEN p_new_driver_limit = 15 THEN 'enterprise'
                ELSE 'custom'
            END
        );

        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Subscription activated',
            'old_limit', v_current_limit,
            'new_limit', p_new_driver_limit
        );

    ELSIF p_event_type IN ('CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE') THEN
        
        -- Revert to free tier (1 driver)
        UPDATE public.users
        SET driver_limit = 1,
            updated_at = NOW()
        WHERE id = p_user_id;

        -- Close subscription history
        UPDATE public.subscription_history
        SET ended_at = NOW(),
            is_active = false
        WHERE user_id = p_user_id AND is_active = true;

        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Subscription cancelled, reverted to free tier',
            'old_limit', v_current_limit,
            'new_limit', 1
        );

    ELSE
        RETURN jsonb_build_object(
            'status', 'ignored',
            'message', 'Event type not handled',
            'event_type', p_event_type
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE public.revenuecat_webhook_log
    SET status = 'error'
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
        'status', 'error',
        'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES
ALTER TABLE public.revenuecat_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Admins can view webhook logs
CREATE POLICY "Admins can view webhook logs" ON public.revenuecat_webhook_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'company_admin')
        )
    );

-- Users can view their own subscription history
CREATE POLICY "Users can view own subscription history" ON public.subscription_history
    FOR SELECT
    USING (user_id = auth.uid());

-- 5. VERIFY SETUP
SELECT 
    tablename, 
    schemaname
FROM pg_tables
WHERE tablename IN ('revenuecat_webhook_log', 'subscription_history')
ORDER BY tablename;
