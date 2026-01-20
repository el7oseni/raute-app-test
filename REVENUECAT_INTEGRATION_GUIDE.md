# 📱 RevenueCat iOS Integration Guide

## STEP 1: Install RevenueCat SDK

### Add Capacitor Plugin:
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

### iOS Native Setup (Xcode):
1. Open `ios/App/App.xcodeproj` in Xcode
2. SDK Auto-linked via CocoaPods (bundled with Capacitor plugin)
3. No manual linking required ✅

---

## STEP 2: Initialize RevenueCat in App

**File**: `app/layout.tsx` (or create `lib/revenuecat.ts`)

```typescript
// lib/revenuecat.ts
import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'

export async function initializeRevenueCat() {
    if (!Capacitor.isNativePlatform()) {
        console.log('RevenueCat: Web platform, skipping initialization')
        return
    }

    try {
        // Get your API key from RevenueCat Dashboard → Apps → Your App → API Keys
        const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY!

        await Purchases.configure({
            apiKey,
            appUserID: undefined, // Let RevenueCat generate, or pass Supabase user.id
            observerMode: false,
            useAmazonSandbox: false
        })

        // Set log level for debugging
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })

        console.log('✅ RevenueCat initialized successfully')
    } catch (error) {
        console.error('❌ RevenueCat initialization failed:', error)
    }
}
```

**Call in Layout**:
```typescript
// In app/layout.tsx useEffect:
useEffect(() => {
    if (typeof window !== 'undefined') {
        initializeRevenueCat()
    }
}, [])
```

---

## STEP 3: Create Products in RevenueCat Dashboard

1. Go to **RevenueCat Dashboard** → **Products**
2. Create offerings:

| Product ID | Name | Driver Limit | Price |
|-----------|------|-------------|-------|
| `raute_5_drivers` | Pro Plan | 5 drivers | $9.99/mo |
| `raute_10_drivers` | Growth Plan | 10 drivers | $19.99/mo |
| `raute_15_drivers` | Business Plan | 15 drivers | $29.99/mo |

3. Link to **App Store Connect** products (must create in-app purchases first)

---

## STEP 4: Wire "Upgrade Now" Button

**File**: `app/drivers/page.tsx` (line 508-520, the upgrade modal)

```typescript
import { Purchases } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'

// Inside the "Upgrade Now" button handler:
async function handleUpgrade() {
    if (!Capacitor.isNativePlatform()) {
        // Web fallback: redirect to Stripe Checkout
        window.location.href = '/checkout?plan=pro'
        return
    }

    try {
        setIsUpgrading(true)

        // Fetch available offerings
        const { offerings } = await Purchases.getOfferings()
        
        if (!offerings.current) {
            throw new Error('No offerings available')
        }

        // Get the "Pro Plan" package (5 drivers)
        const proPackage = offerings.current.availablePackages.find(
            pkg => pkg.product.identifier === 'raute_5_drivers'
        )

        if (!proPackage) {
            throw new Error('Pro plan not found')
        }

        // Trigger purchase flow
        const { customerInfo, productIdentifier } = await Purchases.purchasePackage({
            aPackage: proPackage
        })

        // Check if purchase was successful
        if (customerInfo.entitlements.active['pro']?.isActive) {
            toast({
                title: 'Subscription Activated!',
                description: 'You can now add up to 5 drivers.',
                type: 'success'
            })

            // Refresh driver limit from server
            // (Webhook will have updated it by now)
            await handleRestorePurchases()

            setShowUpgradeModal(false)
        }

    } catch (error: any) {
        // User cancelled or error occurred
        if (error.code !== 'USER_CANCELLED') {
            toast({
                title: 'Purchase Failed',
                description: error.message,
                type: 'error'
            })
        }
    } finally {
        setIsUpgrading(false)
    }
}
```

---

## STEP 5: Update "Restore Purchases" Button

Already functional! The current implementation:
```typescript
// In app/drivers/page.tsx, line 525-555
async function handleRestorePurchases() {
    const { data: userData } = await supabase
        .from('users')
        .select('driver_limit')
        .eq('id', user.id)
        .single()

    if (userData) {
        setMaxDrivers(userData.driver_limit || 1)
        toast({
            title: 'Purchases Restored',
            description: `Driver limit: ${userData.driver_limit}`
        })
    }
}
```

✅ This works perfectly with the webhook! When user restores, it simply refreshes from database.

---

## STEP 6: Configure Webhook in RevenueCat

1. Go to **RevenueCat Dashboard** → **Integrations** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/webhooks/revenuecat`
3. Select events:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ BILLING_ISSUE
   - ✅ UNCANCELLATION

4. **Test webhook**:
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/revenuecat \
     -H "Content-Type: application/json" \
     -d '{"event": {"type": "TEST", "id": "test-123"}}'
   ```

---

## STEP 7: Environment Variables

Add to `.env.local`:

```env
# RevenueCat
NEXT_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_ios_api_key_here

# Stripe (for web fallback)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

---

## STEP 8: Testing Flow

### iOS Testing:
1. Build app in Xcode: `Product → Archive`
2. Upload to TestFlight
3. Install on test device
4. **Use Sandbox tester account** (create in App Store Connect)
5. Click "Upgrade Now"
6. Complete sandbox purchase
7. Check Supabase `users` table → `driver_limit` should update to 5

### Webhook Testing:
1. Go to RevenueCat Dashboard → Event History
2. Find a purchase event
3. Click "Resend Webhook"
4. Check your API logs for webhook processing

---

## STEP 9: Production Checklist

- [ ] Products created in App Store Connect
- [ ] Products linked in RevenueCat Dashboard
- [ ] RevenueCat API key added to `.env.local`
- [ ] Webhook URL configured in RevenueCat
- [ ] Database tables ready:
  - `revenuecat_webhook_log`
  - `subscription_history`
- [ ] "Upgrade Now" button wired to `Purchases.purchasePackage()`
- [ ] "Restore Purchases" tested
- [ ] Sandbox purchase tested in TestFlight
- [ ] Production webhook URL uses HTTPS

---

## 🎯 FINAL STATE

**User Flow**:
1. Manager clicks "Upgrade Now"
2. iOS native purchase sheet appears
3. User completes payment
4. RevenueCat sends webhook to your API
5. API updates `driver_limit` in database
6. Realtime subscription syncs to UI
7. Driver slots unlock instantly! ✅

**Status**: ✅ **READY FOR INTEGRATION**
