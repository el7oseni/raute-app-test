# 📚 Documentation Index

Welcome to the Raute documentation! This index helps you find the right documentation for your needs.

---

## 🚀 Getting Started

Perfect for new developers or team members:

1. [README.md](../README.md) - Project overview and quick start
2. [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines
3. [PROJECT_STATUS.md](../PROJECT_STATUS.md) - Current project status

---

## 🛠 Build & Deployment

| Document | Purpose |
|----------|---------|
| [APPFLOW_FIX.md](../APPFLOW_FIX.md) | Ionic Appflow environment setup |
| [BUILD_COMMANDS.md](../BUILD_COMMANDS.md) | Local build commands |
| [XCODE_BUILD_GUIDE.md](../XCODE_BUILD_GUIDE.md) | iOS build in Xcode |
| [BUILD_ERROR_FIX.md](../BUILD_ERROR_FIX.md) | Common build errors |

---

## 🔐 Security & Configuration

| Document | Purpose |
|----------|---------|
| [ENV_VARIABLES_REFERENCE.md](../ENV_VARIABLES_REFERENCE.md) | API keys & secrets (gitignored) |
| [SUPABASE_PRODUCTION_CHECKLIST_AR.md](../SUPABASE_PRODUCTION_CHECKLIST_AR.md) | Supabase setup checklist |

---

## 🤖 Automation Scripts

| Script | Purpose |
|--------|---------|
| `scripts/verify-env.js` | Validate environment variables |
| `scripts/pre-build.js` | Pre-build validation checks |
| `scripts/db-health-check.js` | Database connection test |
| `scripts/cleanup.js` | Clean build artifacts |

**Usage:**
```bash
node scripts/<script-name>.js
```

---

## 📱 Mobile Development

| Document | Purpose |
|----------|---------|
| [XCODE_BUILD_GUIDE.md](../XCODE_BUILD_GUIDE.md) | iOS development |
| [APPFLOW_FIX.md](../APPFLOW_FIX.md) | Cloud builds |
| [capacitor.config.ts](../capacitor.config.ts) | Capacitor configuration |

---

## 🗄 Database

| Type | Location |
|------|----------|
| **Schema** | [supabase/schema.sql](../supabase/schema.sql) |
| **Migrations** | [sql/migrations/](../sql/migrations/) |
| **Fixes** | [sql/fixes/](../sql/fixes/) |
| **Diagnostics** | [sql/diagnostics/](../sql/diagnostics/) |

---

## 🧭 Quick Navigation

**I want to...**
- 🆕 Set up the project → [README.md](../README.md)
- 🔧 Fix a build error → [BUILD_ERROR_FIX.md](../BUILD_ERROR_FIX.md)
- 📱 Build for iOS → [XCODE_BUILD_GUIDE.md](../XCODE_BUILD_GUIDE.md)
- 🚀 Deploy to Appflow → [ APPFLOW_FIX.md](../APPFLOW_FIX.md)
- 👥 Contribute code → [CONTRIBUTING.md](../CONTRIBUTING.md)
- 🐛 Debug database → `node scripts/db-health-check.js`

---

**Last Updated:** February 3, 2026
