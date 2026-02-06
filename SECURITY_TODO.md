# 🔒 SECURITY TODO - Pre-Launch Checklist

> **🚨 CRITICAL: Complete ALL items before production launch!**

**Last Updated:** February 3, 2026  
**Status:** ⏳ PENDING  
**Priority:** 🔴 HIGH

---

## 📋 Complete Security Checklist

### 🔑 **1. API Keys & Secrets**

#### ✅ Google Maps API Security
- [ ] **Set Application Restrictions**
  - Option A: Set to "None" + API restrictions ✅
  - Option B: HTTP referrers (raute.io/*, localhost:3000/*)
  - Option C: 2 separate keys (Web + iOS)
- [ ] **Set API Restrictions** (Maps, Geocoding, Places only)
- [ ] **Set Usage Quotas**
  - Daily: 1000 requests
  - Per-minute: 50 requests
- [ ] **Enable billing alerts** (when cost > $10)
- [ ] **Test on localhost**
- [ ] **Test on raute.io**

**Link:** https://console.cloud.google.com/apis/credentials

---

#### ✅ Google Gemini API Security
- [ ] **Set Usage Quotas**
  - Daily: 100 requests
  - Per-minute: 10 requests
- [ ] **Enable monitoring**
- [ ] **Set billing alerts**
- [ ] **Test AI import feature**

**Link:** https://aistudio.google.com/app/apikey

---

#### ✅ Supabase Keys Security
- [ ] **Verify Anon Key is public** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] **Verify Service Role Key is PRIVATE** (never exposed to frontend)
- [ ] **Check no Service Role Key in .env.local with NEXT_PUBLIC prefix**
- [ ] **Test authentication flow**

**Link:** https://supabase.com/dashboard/project/ysqcovxkqviufagguvue/settings/api

---

### 🗄️ **2. Database Security**

#### ✅ Supabase RLS Policies
- [ ] **Enable RLS on ALL tables:**
  - [ ] `companies`
  - [ ] `users`  
  - [ ] `drivers`
  - [ ] `orders`
  - [ ] `deliveries` (if exists)
  - [ ] Any other custom tables
- [ ] **Verify policies are correct:**
  - [ ] Users can only see their company data
  - [ ] Drivers can only see their assigned orders
  - [ ] Managers cannot see other companies' data
- [ ] **Test with different user roles:**
  - [ ] Manager account
  - [ ] Driver account
  - [ ] Try to access other company data (should fail ❌)

**Link:** https://supabase.com/dashboard/project/ysqcovxkqviufagguvue/auth/policies

---

#### ✅ Database Backups
- [ ] **Enable automatic backups** in Supabase
- [ ] **Set backup retention** (7 days minimum)
- [ ] **Test restore process** (on staging if possible)
- [ ] **Document backup procedure**

**Link:** https://supabase.com/dashboard/project/ysqcovxkqviufagguvue/settings/database

---

### 🌐 **3. Domain & HTTPS**

#### ✅ SSL/TLS Configuration
- [ ] **Verify HTTPS on raute.io**
- [ ] **Force HTTPS redirect** (HTTP → HTTPS)
- [ ] **Check SSL certificate validity**
- [ ] **Set HSTS headers** (if possible on hosting platform)

---

#### ✅ CORS Configuration
- [ ] **Review allowed origins** in Supabase
- [ ] **Restrict to production domains only:**
  - raute.io
  - *.raute.io
  - (Remove localhost in production)

**Link:** https://supabase.com/dashboard/project/ysqcovxkqviufagguvue/settings/api

---

### 📱 **4. Mobile App Security**

#### ✅ iOS Security
- [ ] **App Transport Security (ATS)** configured
- [ ] **Keychain for sensitive data** (if storing auth tokens)
- [ ] **SSL Pinning** (optional, for extra security)
- [ ] **Code signing** certificate valid
- [ ] **No hardcoded secrets** in iOS code

---

#### ✅ Android Security (if applicable)
- [ ] **Network Security Config** setup
- [ ] **ProGuard/R8** enabled for code obfuscation
- [ ] **App signing** configured
- [ ] **No hardcoded secrets** in Android code

---

### 🔐 **5. Authentication & Authorization**

#### ✅ Supabase Auth Configuration
- [ ] **Email verification enabled**
- [ ] **Password strength requirements** (min 8 chars)
- [ ] **Session timeout** configured (reasonable time)
- [ ] **Rate limiting** on login attempts (Supabase default)
- [ ] **Email templates** customized (from, reply-to, branding)
- [ ] **Redirect URLs** whitelisted:
  - https://raute.io
  - raute://  (for deep linking)

**Link:** https://supabase.com/dashboard/project/ysqcovxkqviufagguvue/auth/url-configuration

---

### 🛡️ **6. Code Security**

#### ✅ Environment Variables
- [ ] **No secrets in git history** (check with `git log --all --full-history -- .env`)
- [ ] **`.env.local` in `.gitignore`** ✅
- [ ] **`ENV_VARIABLES_REFERENCE.md` in `.gitignore`** ✅
- [ ] **No API keys in client-side code** (except NEXT_PUBLIC_*)
- [ ] **Validate with:** `npm run validate`

---

#### ✅ Dependencies Security
- [ ] **Run `npm audit`** and fix high/critical issues
- [ ] **Update outdated packages** (but test after!)
- [ ] **Remove unused dependencies**
- [ ] **Check for known vulnerabilities** in packages

```bash
npm audit --audit-level=high
npm outdated
```

---

#### ✅ Code Review
- [ ] **No `console.log` with sensitive data**
- [ ] **No commented-out code blocks**
- [ ] **No TODO/FIXME for critical items**
- [ ] **Error messages don't expose secrets**
- [ ] **Input validation** on all forms

---

### 📊 **7. Monitoring & Logging**

#### ✅ Error Tracking
- [ ] **Setup error tracking** (Sentry, LogRocket, etc.) - Optional
- [ ] **Don't log sensitive data** (passwords, tokens, full credit cards)
- [ ] **Monitor error dashboard** regularly

---

#### ✅ Analytics
- [ ] **Setup analytics** (Google Analytics, Plausible, etc.) - Optional
- [ ] **Anonymize IP addresses** (GDPR compliance)
- [ ] **Track security-related events:**
  - Failed login attempts
  - Unauthorized access attempts

---

### 🚨 **8. Incident Response**

#### ✅ Preparation
- [ ] **Document key rotation procedure**
- [ ] **Know how to disable compromised API keys**
- [ ] **Have backup admin access** to all services
- [ ] **Emergency contact list** (Google, Supabase support)

---

#### ✅ Key Rotation Schedule
Set reminders to rotate keys:

| Key Type | Rotation | Last Rotated | Next Rotation |
|----------|----------|--------------|---------------|
| Google Maps | Every 90 days | - | - |
| Gemini API | Every 90 days | - | - |
| Supabase Anon | Only if compromised | - | N/A |
| Service Role | Only if compromised | - | N/A |

---

### ✅ **9. Compliance & Privacy**

#### ✅ GDPR/Privacy
- [ ] **Privacy Policy** page created
- [ ] **Terms of Service** page created
- [ ] **Cookie consent** (if using cookies)
- [ ] **Data deletion** process documented
- [ ] **Data export** capability (if required)

---

#### ✅ App Store Requirements
- [ ] **App Privacy** details filled in App Store Connect
- [ ] **Data collection** disclosed (location, email, etc.)
- [ ] **Third-party SDKs** listed (Google Maps, Supabase)

---

## 🧪 **Final Security Testing**

### Before Launch - Test Everything:

```bash
# 1. Validate environment
npm run validate

# 2. Run pre-build checks
npm run pre-build

# 3. Test database connection
npm run db-check

# 4. Build production version
npm run build

# 5. Test production build locally
npm run start
```

### Manual Testing Checklist:
- [ ] **Login/Logout** works
- [ ] **Signup** works and sends verification email
- [ ] **Password reset** works
- [ ] **Different user roles** see appropriate data only
- [ ] **Try to access** another company's data (should fail ❌)
- [ ] **Maps load** correctly
- [ ] **AI import** works (if using Gemini)
- [ ] **Mobile app** connects to production backend
- [ ] **All API calls** use HTTPS

---

## 📊 **Timeline & Priority**

### Critical (Do FIRST) 🔴
- Google Maps API restrictions (~5 min)
- Supabase RLS verification (~10 min)
- Environment variables check (~2 min)

### High Priority 🟠  
- Gemini API quotas (~2 min)
- Database backups (~5 min)
- npm audit (~5 min)

### Medium Priority 🟡
- Error tracking setup (~30 min)
- Privacy policy (~60 min)
- Key rotation schedule (~5 min)

**Total Critical Path: ~30 minutes**  
**Total for everything: ~2-3 hours**

---

## ✅ **Final Checklist**

Before clicking "Deploy" or "Submit to App Store":

- [ ] All API keys have restrictions ✅
- [ ] All quotas set ✅
- [ ] RLS verified on all tables ✅
- [ ] No secrets in code ✅
- [ ] HTTPS working ✅
- [ ] Authentication tested ✅
- [ ] npm audit clean ✅
- [ ] Privacy policy published ✅
- [ ] Error tracking setup ✅
- [ ] Backups enabled ✅

---

## 🚀 **After Completing**

1. ✅ Check all boxes above
2. 📝 Update `PRODUCTION_CHECKLIST.md`
3. 🎯 Run final tests
4. 🚀 **Ready for launch!**

---

**Status:** ⏳ Pending  
**Last Review:** February 3, 2026  
**Next Review:** Before launch date
