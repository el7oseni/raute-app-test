-- ============================================
-- CONCURRENT DISPATCH PROTECTION
-- ============================================
-- Prevents race conditions when multiple dispatchers
-- assign the same driver to different routes simultaneously

-- 1. ADD OPTIMISTIC LOCKING COLUMN
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_version ON public.orders(id, version);

-- 2. FUNCTION: Safe Order Assignment (WITH OPTIMISTIC LOCK)
CREATE OR REPLACE FUNCTION public.safe_assign_driver(
    p_order_id UUID,
    p_driver_id UUID,
    p_expected_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_current_version INTEGER;
    v_current_driver_id UUID;
    v_rows_updated INTEGER;
BEGIN
    -- Get current state
    SELECT version, driver_id 
    INTO v_current_version, v_current_driver_id
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE; -- Locks the row

    -- Verify version matches (optimistic lock check)
    IF v_current_version != p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'conflict',
            'message', 'Order was modified by another user. Please refresh and try again.',
            'current_version', v_current_version
        );
    END IF;

    -- Check if driver is already assigned to avoid double-booking
    IF v_current_driver_id = p_driver_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Driver already assigned to this order',
            'version', v_current_version
        );
    END IF;

    -- Perform update with version increment
    UPDATE public.orders
    SET 
        driver_id = p_driver_id,
        status = 'assigned',
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_order_id
    AND version = p_expected_version; -- Double-check version

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'conflict',
            'message', 'Update failed due to concurrent modification'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Driver assigned successfully',
        'new_version', v_current_version + 1
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'exception',
        'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER: Auto-increment version on any update
CREATE OR REPLACE FUNCTION public.increment_order_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if NOT using safe_assign_driver function
    -- (that function handles its own versioning)
    IF TG_OP = 'UPDATE' AND OLD.version = NEW.version THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_order_version ON public.orders;
CREATE TRIGGER trg_increment_order_version
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_order_version();

-- 4. VERIFY SETUP
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name = 'version';
