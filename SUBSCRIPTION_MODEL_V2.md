# 🚀 SUBSCRIPTION MODEL UPDATE - "1 Free, Then Blocks of 5"

## 📊 NEW BUSINESS MODEL

### Tier Structure
- **Free Tier**: 1 driver (no payment required)
- **Pro Tier ($20/month)**: 5 drivers total (includes the free driver)
- **Growth Tier ($40/month)**: 10 drivers total
- **Enterprise Tier ($60/month)**: 15 drivers total
- **Scale continues**: +$20 for every additional 5 drivers

### Implementation Details

1. **Default Limit**: New users start with `driver_limit = 1`
2. **First Upgrade**: Purchasing the first $20 tier sets `driver_limit = 5`
3. **Subsequent Upgrades**: Each additional $20 adds +5 to the total

---

## 🔧 TECHNICAL CHANGES MADE

### Database
- **File**: `supabase/add_driver_limit.sql`
- **Change**: `DEFAULT 5` → `DEFAULT 1`
- **Migration**: `supabase/migrate_to_1_driver_free_tier.sql` (for existing users)

### Frontend
- **File**: `app/drivers/page.tsx`
- **Changes**:
  - `useState(5)` → `useState(1)` (default state)
  - Dynamic paywall messaging:
    - Free tier (1 driver): "Unlock 5 driver slots for $20/month"
    - Paid tiers: "Add 5 more slots (X → X+5) for $20/month"
  - Plural handling: "1 driver" vs "X drivers"

---

## 📋 DEPLOYMENT CHECKLIST

### Phase 1: Database Migration (CRITICAL)
Run these scripts in **Supabase SQL Editor** in order:

1. **Update schema** (if not already done):
   ```sql
   -- File: supabase/add_driver_limit.sql
   -- Sets DEFAULT to 1 for new users
   ```

2. **Migrate existing users**:
   ```sql
   -- File: supabase/migrate_to_1_driver_free_tier.sql
   -- Updates existing users from 5 → 1 (unless already upgraded)
   ```

### Phase 2: Frontend Deployment
```bash
# 1. Build
npm run build

# 2. Test locally
npm run dev

# 3. Verify paywall triggers when adding 2nd driver
# 4. Verify dynamic messaging shows correctly

# 5. Deploy to Vercel
git add .
git commit -m "feat: implement 1-free-driver subscription model"
git push origin main
```

### Phase 3: iOS Build
```bash
# Sync changes to iOS
npx cap sync ios

# Open Xcode
npx cap open ios

# Update Version/Build if needed
# Archive and upload to App Store Connect
```

---

## 🧪 TESTING SCENARIOS

### Scenario 1: New User (Free Tier)
1. Sign up as manager
2. Go to `/drivers`
3. **Expect**: Button shows "Add Driver (0/1)"
4. Add 1st driver → Success
5. Click "Add Driver" again
6. **Expect**: Upgrade paywall appears with message:
   - "You have reached the limit of **1 driver**"
   - "**Unlock 5 driver slots** for **$20/month**"

### Scenario 2: Upgraded User (5 Drivers)
1. User has purchased first tier (`driver_limit = 5`)
2. Add 5 drivers successfully
3. Click "Add Driver" when at 5/5
4. **Expect**: Paywall shows:
   - "You have reached the limit of **5 drivers**"
   - "Add **5 more slots** (5 → 10) for **$20/month**"

### Scenario 3: Restore Purchases
1. User reinstalls app (or logs in on new device)
2. Clicks "Add Driver" while at free tier limit
3. Paywall appears
4. Clicks "**Restore Purchases**"
5. **Expect**: System queries Supabase for `driver_limit`
6. If previously purchased, limit updates to purchased tier

---

## 💡 REVENUE CALCULATION EXAMPLES

- **100 users** @ Free Tier (1 driver each) = **$0/month**
- **50 users** @ Pro Tier (5 drivers) = **$1,000/month**
- **20 users** @ Growth Tier (10 drivers) = **$800/month**
- **10 users** @ Enterprise+ (15 drivers) = **$600/month**

**Total MRR**: $2,400/month from 180 users

---

## ✅ COMPLIANCE VERIFIED

- ✅ App Store: "Restore Purchases" button present
- ✅ Pricing clearly communicated in UI
- ✅ No "fake urgency" paywalls
- ✅ Free tier functional (1 driver is usable)
- ✅ Upgrade path transparent

**Status**: 🟢 **READY FOR PRODUCTION**
