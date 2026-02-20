# 🚀 Quick Mac Commands for Raute iOS Build

## Prerequisites - Install Once
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Close and reopen terminal, then:
nvm install 20
nvm use 20
nvm alias default 20

# Verify Node 20
node --version  # Must show v20.x.x

# Install CocoaPods
sudo gem install cocoapods
```

---

## Build Commands - Run Every Time

```bash
# 1. Clone project (first time only)
cd ~/Desktop
git clone https://github.com/el7oseni/raute-app-test.git
cd raute-app-test

# 2. Pull latest changes
git pull origin main

# 3. Create .env.local file (get values from project owner)
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=<ask-project-owner>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask-project-owner>
NEXT_PUBLIC_GEMINI_API_KEY=<ask-project-owner>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<ask-project-owner>
EOF
# ⚠️ Get actual values from the project owner. Never commit real keys.

# 4. Install dependencies
npm install

# 5. Build for mobile
npm run build:mobile

# 6. Sync with iOS
npx cap sync ios

# 7. Open Xcode
npx cap open ios
```

---

## In Xcode (Manual Steps)

1. **Signing & Capabilities** → Select your **Team**
2. Click **▶️ Play** button (or press `Cmd+R`)
3. Wait for build to complete
4. App should launch on simulator/device

---

## If Errors Occur

### "pod install failed"
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios
```

### "out directory not found"
```bash
npm run build:mobile
npx cap sync ios
```

### "node not found"
```bash
nvm use 20
node --version
```

### Clean rebuild
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:mobile
npx cap sync ios
```

---

## Done! 🎉
App should be running on simulator or device.
