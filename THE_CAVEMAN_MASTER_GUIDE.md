# 🛠️ THE CAVEMAN_MASTER_GUIDE: iOS Production Build

This guide certifies that **Raute** is optimized for "The Caveman Way" Apple Approval. Follow these steps strictly to ensure a crash-free, compliant 1.0.0 submission.

## 1. 🚨 Critical Database Update
Before building, you **MUST** run the newly created migration to enable Subscription Limits.
1. Go to Supabase SQL Editor.
2. Open/Paste content from `supabase/add_driver_limit.sql`.
3. Run it. (It adds `driver_limit` column to `users` table).

## 2. 🍏 Apple Compliance Audit (COMPLETED)
We have automatically patched the codebase for compliance:
- **Legal Framework**: `Privacy Policy` and `Terms` are live at `/privacy` and `/terms` and linked in the User Profile.
- **Account Deletion**: A "Danger Zone" with permanent account deletion is now available in the User Profile logic (calls `supabaseAdmin.deleteUser`).
- **No Beta Policy**: All "Coming Soon" or "Beta" text effectively scrubbed or replaced with functional empty states.
- **Info.plist**: Verified professional descriptions for Camera, Location (Always/WhenInUse), and Photo Library usage.

## 3. 💳 Subscription Logic (5-Driver Blocks)
- **Logice Fixed**: The "Add Driver" button now checks `users.driver_limit`.
- **Enforcement**: Default limit is **5**. If exceeded, an "Upgrade Paywall" modal appears.
- **Pricing**: UI reflects "$20/block of 5 drivers".

## 4. 🎨 Final Visual & Xcode Prep
The `AppIcon.appiconset` currently has a placeholder. For the attached PNG:
1. **Generate Assets**: Go to [AppIcon.co](https://appicon.co), upload your PNG, select "iPhone" + "iPad".
2. **Replace**: Download the zip, replace the contents of `ios/App/App/Assets.xcassets/AppIcon.appiconset` with the generated files.
3. **Open Xcode**:
   ```bash
   npx cap open ios
   ```
4. **Validations in Xcode**:
   - Updates **Version** to `1.0.0` and **Build** to `1`.
   - Ensure **Bundle Identifier** is `com.raute.app`.
   - In "Signing & Capabilities", select your **Team**.

## 5. 🚀 Deployment Command
Run this exact sequence to sync your web code to the Native iOS project:

```bash
# 1. Build Web Assets
npm run build

# 2. Sync to Capacitor (Copies 'out' folder to ios/App/public)
npx cap sync ios

# 3. Open Xcode to Archive
npx cap open ios
```

*Then in Xcode: Product -> Archive -> Distribute App -> App Store Connect.*

**Good luck, Caveman. We are ready.**
