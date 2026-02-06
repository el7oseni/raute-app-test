# 🚀 Production Readiness Checklist

Use this checklist before deploying to production or releasing a new version.

---

## ✅ Pre-Deployment Checklist

### 1. Code Quality
- [ ] All TypeScript errors resolved (`npm run build`)
- [ ] ESLint warnings addressed (`npm run lint`)
- [ ] Code formatted with Prettier (`npm run format`)
- [ ] No `console.log` statements in production code
- [ ] No commented-out code blocks

### 2. Environment & Configuration
- [ ] Environment variables validated (`npm run validate`)
- [ ] API keys have proper restrictions (Google Maps, Gemini)
- [ ] Supabase RLS policies reviewed and tested
- [ ] `.env.local` not committed to git
- [ ] `ENV_VARIABLES_REFERENCE.md` added to `.gitignore`

### 3. Database
- [ ] Database health check passed (`npm run db-check`)
- [ ] All migrations applied
- [ ] RLS policies tested for all roles
- [ ] Indexes created for performance
- [ ] Backup strategy in place

### 4. Security

> [!IMPORTANT]
> **See [SECURITY_TODO.md](./SECURITY_TODO.md) for complete security checklist**

- [ ] All items in `SECURITY_TODO.md` completed ✅
- [ ] No hardcoded credentials in code
- [ ] Service role key never exposed to frontend
- [ ] CORS settings configured correctly
- [ ] Rate limiting enabled on critical endpoints
- [ ] Authentication flows tested (login, signup, logout)
- [ ] API keys have proper restrictions (Google Maps, Gemini)
- [ ] Database RLS policies verified

### 5. Performance
- [ ] Build completes without warnings
- [ ] Static export generates correctly
- [ ] Images optimized
- [ ] Lazy loading implemented where appropriate
- [ ] Bundle size reviewed

### 6. Mobile (iOS/Android)
- [ ] Capacitor sync successful
- [ ] App icons and splash screens configured
- [ ] Deep links tested
- [ ] Push notifications configured (if applicable)
- [ ] GPS permissions requested properly
- [ ] Camera permissions working

### 7. Testing
- [ ] Manual testing on Chrome, Safari, Firefox
- [ ] Testing on actual iOS device
- [ ] Testing on actual Android device
- [ ] Offline mode tested (if applicable)
- [ ] Different user roles tested (manager, driver)

### 8. Documentation
- [ ] README.md up to date
- [ ] CHANGELOG.md updated with new version
- [ ] API changes documented
- [ ] Breaking changes highlighted

### 9. Appflow Build
- [ ] Environment variables added to Appflow
- [ ] Build triggered successfully
- [ ] Downloaded .ipa/.apk tested
- [ ] App Store Connect / Play Console ready

### 10. Monitoring & Analytics
- [ ] Error tracking setup (Sentry, LogRocket, etc.)
- [ ] Analytics configured
- [ ] Performance monitoring enabled

---

## 🔍 Pre-Release Verification

Run these commands before deploying:

```bash
# 1. Clean build artifacts
npm run clean

# 2. Validate environment
npm run validate

# 3. Check database  
npm run db-check

# 4. Run full pre-build checks
npm run pre-build

# 5. Test production build
npm run build
npm run start
```

---

## 📱 Mobile Release Checklist

### iOS
- [ ] Xcode project opens without errors
- [ ] App builds and runs on simulator
- [ ] App builds and runs on real device
- [ ] Version number incremented in `Info.plist`
- [ ] App icons all resolutions present
- [ ] App Store screenshots prepared

### Android
- [ ] Android Studio project opens without errors
- [ ] App builds and runs on emulator
- [ ] App builds and runs on real device
- [ ] Version code incremented in `build.gradle`
- [ ] App signing configured
- [ ] Google Play screenshots prepared

---

## 🚦 Deployment Steps

### 1. Prepare Release
```bash
# Update version
npm version patch  # or minor, or major

# Update CHANGELOG.md
# - Add release date
# - List all changes

# Commit changes
git add .
git commit -m "chore: prepare v1.0.0 release"
git tag v1.0.0
```

### 2. Deploy Web
```bash
# Build for production
npm run build

# Deploy to Vercel/your hosting
# Follow your hosting provider's deployment process
```

### 3. Deploy Mobile
```bash
# Trigger Appflow build
# or
npm run build:ios
npx cap open ios
# Archive and upload to App Store Connect
```

---

## ✅ Post-Deployment

- [ ] Verify deployment URL is accessible
- [ ] Test critical user flows (login, create order, optimize route)
- [ ] Monitor error tracking dashboard
- [ ] Check analytics for any spikes in errors
- [ ] Notify team of successful deployment

---

## 🐛 Rollback Plan

If issues are detected:

1. **Web:** Revert to previous deployment
2. **Mobile:** Submit hotfix update with expedited review
3. **Database:** Restore from backup if needed
4. **Notify users** via in-app message or email

---

**Last Updated:** February 3, 2026
