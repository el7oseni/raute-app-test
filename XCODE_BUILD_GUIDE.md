# 🍎 دليل تشغيل Raute على Xcode

**التاريخ:** فبراير 2026  
**المشروع:** Raute iOS App

---

## ✅ المتطلبات الأساسية

### 1. **النظام**
- macOS 13+ (Ventura أو أحدث)
- Xcode 15+ مثبت من App Store
- مساحة فاضية: 5GB على الأقل

### 2. **Node.js - مهم جدًا! ⚠️**
```bash
# تثبيت Node.js 20 (الإصدار المطلوب)
# استخدم nvm لسهولة التبديل بين الإصدارات

# تثبيت nvm إذا لم يكن مثبتًا
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# إعادة تشغيل الـ terminal ثم:
nvm install 20
nvm use 20
nvm alias default 20

# تحقق من الإصدار (يجب أن يكون 20.x.x)
node --version
# Output: v20.19.3 (أو أي v20.x.x)
```

### 3. **أدوات إضافية**
```bash
# تثبيت Homebrew إذا لم يكن مثبتًا
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# تثبيت CocoaPods (مدير حزم iOS)
sudo gem install cocoapods

# تحقق من التثبيت
pod --version
```

---

## 📥 الخطوة 1: استنساخ المشروع

```bash
# انتقل إلى المجلد الذي تريد العمل فيه
cd ~/Desktop

# استنساخ المشروع
git clone https://github.com/el7oseni/raute-app-test.git

# الدخول إلى مجلد المشروع
cd raute-app-test

# تأكد من أنك على آخر commit
git pull origin main
```

---

## 🔧 الخطوة 2: إعداد Environment Variables

قبل أي شيء، **لازم** تنشئ ملف `.env.local` في جذر المشروع:

```bash
# إنشاء ملف .env.local
nano .env.local
```

**الصق المحتوى التالي:** (اطلبها من صاحب المشروع)

```env
NEXT_PUBLIC_SUPABASE_URL=<ask-project-owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask-project-owner>
NEXT_PUBLIC_GEMINI_API_KEY=<ask-project-owner>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<ask-project-owner>
```

> **⚠️ Get the actual values from the project owner. Never commit real keys.**

**احفظ الملف:** اضغط `Ctrl+O` ثم `Enter` ثم `Ctrl+X`

---

## 📦 الخطوة 3: تثبيت Dependencies

```bash
# تأكد من استخدام Node 20
node --version  # يجب أن يظهر v20.x.x

# تثبيت dependencies الخاصة بـ Next.js
npm install

# يجب أن تظهر:
# ✓ Dependencies installed successfully
```

> **⚠️ هام:** إذا ظهرت أخطاء في `npm install`، جرب:
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

---

## 🏗️ الخطوة 4: Build للموبايل

```bash
# Build المشروع للموبايل (static export)
npm run build:mobile

# يجب أن تظهر:
# ✅ Backed up api to temp directory
# ✅ Backed up auth to temp directory
# ✅ Backed up middleware.ts to temp directory
# ✓ Compiled successfully
# ✅ Restored api from backup
# ✅ Restored auth from backup
```

> **إذا ظهر خطأ `supabaseUrl is required`:**
> - تأكد من أن ملف `.env.local` موجود في جذر المشروع
> - تأكد من أن المحتوى مكتوب بشكل صحيح بدون مسافات زائدة

---

## 📱 الخطوة 5: Sync مع iOS

```bash
# مزامنة Capacitor مع مجلد iOS
npx cap sync ios

# يجب أن تظهر:
# ✔ Copying web assets from out to ios/App/App/public in 234.56ms
# ✔ Creating capacitor.config.json in ios/App/App in 1.23ms
# ✔ copy ios in 245.67ms
# ✔ Updating iOS plugins in 12.34ms
# ✔ Updating iOS native dependencies with pod install in 45.67s
```

> **⚠️ إذا ظهر خطأ في pod install:**
> ```bash
> cd ios/App
> pod deintegrate
> pod install
> cd ../..
> ```

---

## 🚀 الخطوة 6: فتح المشروع في Xcode

```bash
# فتح المشروع في Xcode
npx cap open ios

# أو يدويًا:
open ios/App/App.xcworkspace
```

> **⚠️ هام:** تأكد من فتح `.xcworkspace` **وليس** `.xcodeproj`

---

## ⚙️ الخطوة 7: إعدادات Xcode

### 1. **اختيار Team (Apple Developer Account)**
- في Xcode، اذهب إلى: **Signing & Capabilities**
- تحت **Team**، اختر حساب Apple Developer الخاص بك
- إذا لم يكن لديك حساب، استخدم **Personal Team** (للتجربة فقط)

### 2. **تغيير Bundle Identifier** (اختياري للتجربة)
- في **General** → **Identity**
- غير `io.raute.app` إلى شيء فريد مثل:
  ```
  com.yourname.raute
  ```

### 3. **اختيار جهاز**
- في شريط الأدوات العلوي، اختر جهاز iPhone متصل
- أو اختر **Any iOS Device** للـ build فقط
- أو اختر محاكي مثل **iPhone 15 Pro**

---

## ▶️ الخطوة 8: تشغيل التطبيق

### **للتشغيل على محاكي:**
```
1. اختر محاكي من القائمة (مثل iPhone 15 Pro)
2. اضغط على زر ▶️ (Play) أو Cmd+R
3. انتظر البناء (قد يستغرق 2-3 دقائق أول مرة)
```

### **للتشغيل على جهاز حقيقي:**
```
1. وصّل iPhone بالماك عبر USB
2. اختر الجهاز من القائمة
3. قد تحتاج للثقة بالجهاز (Trust This Computer)
4. اضغط ▶️
5. على iPhone: Settings → General → VPN & Device Management
   → اختر Developer App → Trust
```

---

## 🐛 حل المشاكل الشائعة

### ❌ **خطأ: "Could not find node"**
```bash
# تأكد من Node 20
nvm use 20
node --version
```

### ❌ **خطأ: "pod install failed"**
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install --repo-update
cd ../..
```

### ❌ **خطأ: "Signing requires a development team"**
- افتح Xcode
- اذهب إلى **Signing & Capabilities**
- اختر Team أو أضف Apple ID الخاص بك

### ❌ **خطأ: "out directory not found"**
```bash
# Build المشروع مرة أخرى
npm run build:mobile
npx cap sync ios
```

### ❌ **شاشة بيضاء في التطبيق**
- تأكد من ملف `.env.local` موجود
- تأكد من تشغيل `npm run build:mobile` قبل `npx cap sync ios`

---

## 📝 ملاحظات مهمة

### ✅ **التأكد من نجاح البناء:**
بعد فتح التطبيق على المحاكي/الجهاز، يجب أن ترى:
1. شاشة تسجيل الدخول (Login Page)
2. شعار Raute في الأعلى
3. حقول Email و Password
4. أزرار Google و Apple OAuth

### 🔄 **إذا غيرت أي كود:**
```bash
# 1. Build مرة أخرى
npm run build:mobile

# 2. Sync مع iOS
npx cap sync ios

# 3. أعد تشغيل التطبيق من Xcode (Cmd+R)
```

### 🌐 **Live Reload (اختياري):**
للتطوير السريع بدون build في كل مرة:
```bash
# 1. شغّل dev server
npm run dev

# 2. في ملف capacitor.config.ts، uncomment:
# server: {
#   url: 'http://localhost:3000',
#   cleartext: true
# }

# 3. Sync
npx cap sync ios

# 4. شغّل من Xcode
```

---

## 🎯 Checklist النهائي

قبل إرسال الـ build:
- [ ] Node 20 مثبت ومستخدم
- [ ] ملف `.env.local` موجود وصحيح
- [ ] `npm install` اشتغل بدون أخطاء
- [ ] `npm run build:mobile` اشتغل بدون أخطاء
- [ ] `npx cap sync ios` اشتغل بدون أخطاء
- [ ] Xcode مفتوح على `.xcworkspace`
- [ ] Team محدد في Signing & Capabilities
- [ ] التطبيق يعمل على المحاكي/الجهاز

---

## 📞 للدعم

إذا واجهت أي مشكلة، أرسل:
1. رسالة الخطأ الكاملة
2. نتيجة `node --version`
3. نتيجة `pod --version`
4. Screenshot من Xcode

---

**🎉 بالتوفيق في البناء!**
