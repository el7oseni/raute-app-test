# ✅ SUPABASE PRODUCTION SETUP CHECKLIST

## 📋 MUST DO (قبل النشر)

### 1️⃣ تشغيل SQL Migrations (بالترتيب)

افتح **Supabase Dashboard → SQL Editor** واعمل الآتي:

#### Migration 1: Driver Limit Column
```sql
-- File: supabase/add_driver_limit.sql
-- Purpose: Add driver_limit column with default = 1
```
**Run**: Copy file content → Paste in SQL Editor → Execute

---

#### Migration 2: Migrate Existing Users to Free Tier
```sql
-- File: supabase/migrate_to_1_driver_free_tier.sql
-- Purpose: Set all existing users to driver_limit = 1
```
**Run**: Copy file content → Execute

---

#### Migration 3: Driver Activity Logs Table
```sql
-- File: supabase/create_driver_activity_logs.sql
-- Purpose: Create table for driver status logging
```
**Run**: Copy file content → Execute

---

#### Migration 4: Fix Driver Logs RLS Policies
```sql
-- File: supabase/fix_driver_logs_rls.sql
-- Purpose: Allow authenticated users to view/insert logs
```
**Run**: Copy file content → Execute

---

#### Migration 5: Webhook Idempotency (إذا بتستخدم Subscriptions)
```sql
-- File: supabase/webhook_idempotency.sql
-- Purpose: Create webhook log & subscription history tables
```
**Run**: Copy file content → Execute (اختياري)

---

### 2️⃣ Storage Buckets Configuration

#### Bucket 1: `proofs` (لصور POD)
**الحالة**: ✅ موجود بالفعل

**تأكد من**:
- [ ] Public access enabled
- [ ] File size limit: 10MB
- [ ] Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

**Check**:
```sql
-- Verify bucket exists:
SELECT * FROM storage.buckets WHERE name = 'proofs';
```

---

#### Bucket 2: `profiles` (لصور Profile)
**الحالة**: ✅ موجود بالفعل

**تأكد من**:
- [ ] Public access enabled (للقراءة فقط)
- [ ] RLS policies configured
- [ ] Folder: `avatars/`

**Check**:
```sql
-- Verify bucket exists:
SELECT * FROM storage.buckets WHERE name = 'profiles';
```

---

### 3️⃣ Email Templates Customization

#### Location: **Authentication → Email Templates**

**Templates to Customize**:
1. **Confirm Signup** (Email Verification)
   - [ ] Add app logo
   - [ ] Add company branding
   - [ ] Test email delivery

2. **Reset Password**
   - [ ] Update button text
   - [ ] Add support contact

3. **Invite User** (optional)
   - [ ] Customize message

**Default Templates**: Work fine, but generic

---

### 4️⃣ Authentication Settings

#### Location: **Authentication → Settings**

**Configure**:
- [ ] **Email Confirmations**: Enabled ✅
- [ ] **Email Auth**: Enabled ✅
- [ ] **Redirect URLs**:
  ```
  http://localhost:3000/auth/callback
  https://your-production-domain.com/auth/callback
  https://your-production-domain.com/update-password
  ```
- [ ] **Rate Limiting**: Keep default (prevents abuse)
- [ ] **Session Timeout**: 7 days (default) ✅

---

### 5️⃣ Database Backups (مهم جداً!)

#### Location: **Settings → Database → Backups**

**Setup**:
- [ ] Enable **Automatic Daily Backups**
- [ ] Set retention period: 7 days minimum
- [ ] Test restore (once before production)

**Manual Backup Now**:
```bash
# Via CLI:
supabase db dump --remote > backup_$(date +%Y%m%d).sql
```

---

### 6️⃣ RLS Policies Audit

#### Verify These Tables Have RLS Enabled:

```sql
-- Check RLS status:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'drivers', 'orders', 'companies', 
    'hubs', 'driver_activity_logs', 'custom_fields'
);
```

**Expected**: All should have `rowsecurity = true`

**If Any is FALSE**:
```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
```

---

### 7️⃣ API Keys & Secrets

#### Location: **Settings → API**

**Keys to Copy**:
1. ✅ **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
2. ✅ **anon public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ✅ **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (سري!)

**Add to**:
- `.env.local` (for local development)
- Vercel Environment Variables (for production)

**⚠️ NEVER** commit `service_role` key to GitHub!

---

### 8️⃣ Database Performance (Optional but Recommended)

#### Create Indexes for Better Performance:

```sql
-- Order queries optimization:
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Driver queries:
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);

-- Activity logs:
CREATE INDEX IF NOT EXISTS idx_activity_logs_driver_timestamp 
ON driver_activity_logs(driver_id, timestamp DESC);
```

---

### 9️⃣ Enable Realtime (for Live Updates)

#### Location: **Database → Replication**

**Tables to Enable Realtime**:
- [ ] `users` (for driver_limit sync)
- [ ] `orders` (for live order updates)
- [ ] `drivers` (for driver status changes)

**How**:
1. Go to Database → Replication
2. Find table → Click "Enable Realtime"
3. Repeat for each table

---

### 🔟 SMTP Configuration (Email Delivery)

#### Location: **Authentication → Settings → SMTP**

**Options**:

**Option A: Use Supabase Default** (محدود)
- ✅ Already configured
- ⚠️ Limited to 4 emails/hour
- ✅ Good for testing

**Option B: Custom SMTP** (موصى به للإنتاج)
- Gmail SMTP
- SendGrid
- Mailgun
- AWS SES

**Gmail Example**:
```
SMTP Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: [App Password]
```

---

## 📊 PRODUCTION CHECKLIST SUMMARY

| Task | Status | Priority |
|------|--------|----------|
| Run SQL migrations | ⚠️ Required | 🔴 Critical |
| Verify storage buckets | ⚠️ Required | 🔴 Critical |
| Add redirect URLs | ⚠️ Required | 🔴 Critical |
| Enable backups | ⚠️ Required | 🔴 Critical |
| Verify RLS policies | ⚠️ Required | 🔴 Critical |
| Copy API keys to Vercel | ⚠️ Required | 🔴 Critical |
| Customize email templates | 🟡 Optional | 🟡 Medium |
| Create indexes | 🟡 Optional | 🟢 Low |
| Enable realtime | 🟡 Optional | 🟡 Medium |
| Setup custom SMTP | 🟡 Optional | 🟡 Medium |

---

## 🚀 QUICK START SCRIPT

Copy this to Supabase SQL Editor and run:

```sql
-- ============================================
-- PRODUCTION SETUP - RUN ALL AT ONCE
-- ============================================

-- 1. Add driver_limit column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS driver_limit INTEGER DEFAULT 1;

-- 2. Set all existing users to free tier
UPDATE public.users SET driver_limit = 1 WHERE driver_limit IS NULL OR driver_limit = 5;

-- 3. Create driver_activity_logs table
CREATE TABLE IF NOT EXISTS public.driver_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'on_break', 'driving', 'idle')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_driver_id ON public.driver_activity_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_activity_logs_timestamp ON public.driver_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 5. Fix RLS policies for driver_activity_logs
DROP POLICY IF EXISTS "Authenticated users can view driver logs" ON public.driver_activity_logs;
CREATE POLICY "Authenticated users can view driver logs" ON public.driver_activity_logs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.driver_activity_logs;
CREATE POLICY "Authenticated users can insert logs" ON public.driver_activity_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Done!
SELECT 'Setup Complete! ✅' as status;
```

---

## ✅ VERIFICATION COMMANDS

Run these to verify everything is OK:

```sql
-- 1. Check driver_limit column exists:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'driver_limit';

-- 2. Check driver_activity_logs table:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'driver_activity_logs';

-- 3. Check storage buckets:
SELECT name, public 
FROM storage.buckets 
WHERE name IN ('proofs', 'profiles');

-- 4. Check RLS policies:
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'drivers', 'orders', 'driver_activity_logs')
ORDER BY tablename, policyname;
```

---

## 🎯 FINAL STEPS

**After Running All Migrations**:
1. ✅ Go to Vercel Dashboard
2. ✅ Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ Redeploy Vercel app
4. ✅ Test login/signup on production
5. ✅ Test POD upload
6. ✅ Test driver creation (should hit limit of 1)

---

**Status**: ✅ All Supabase tasks documented and ready!
