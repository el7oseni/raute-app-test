# 📋 Complete Mac Terminal Commands - Copy & Paste

## STEP 1: Install Node 20 (First Time Only)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

**❗ IMPORTANT: Close terminal and open new terminal window, then continue:**

```bash
# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20
node --version
```

## STEP 2: Install CocoaPods (First Time Only)
```bash
sudo gem install cocoapods
```

## STEP 3: Clone Project
```bash
cd ~/Desktop
git clone https://github.com/el7oseni/raute-app-test.git
cd raute-app-test
```

## STEP 4: Create Environment File
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=<ask-project-owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask-project-owner>
NEXT_PUBLIC_GEMINI_API_KEY=<ask-project-owner>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<ask-project-owner>
EOF
```

> **⚠️ Get the actual values from the project owner. Never commit real keys.**

## STEP 5: Install Dependencies
```bash
npm install
```

## STEP 6: Build for Mobile
```bash
npm run build:mobile
```

## STEP 7: Sync with iOS
```bash
npx cap sync ios
```

## STEP 8: Open Xcode
```bash
npx cap open ios
```

---

## In Xcode (Manual):
1. Top menu: Select your Team in **Signing & Capabilities**
2. Click **▶️ Play** button (top-left)
3. Wait ~2 minutes for first build
4. App launches on simulator

---

## IF BUILD FAILS - Run These:

### Fix 1: Pod Issues
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios
```

### Fix 2: Clean Rebuild
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:mobile
npx cap sync ios
```

### Fix 3: Verify Node 20
```bash
nvm use 20
node --version
```

---

## 🎯 Summary - Minimum Commands to Run:

**First time setup:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# Close & reopen terminal
nvm install 20 && nvm use 20 && nvm alias default 20
sudo gem install cocoapods
```

**Every build:**
```bash
cd ~/Desktop
git clone https://github.com/el7oseni/raute-app-test.git
cd raute-app-test
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=<ask-project-owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask-project-owner>
NEXT_PUBLIC_GEMINI_API_KEY=<ask-project-owner>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<ask-project-owner>
EOF
# ⚠️ Get actual values from the project owner. Never commit real keys.
npm install
npm run build:mobile
npx cap sync ios
npx cap open ios
```

**Then in Xcode: Select Team → Press ▶️**

✅ Done!
