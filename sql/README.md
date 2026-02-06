# 🗂️ SQL Files Organization Guide

This guide explains how to organize the SQL files in this project.

---

## 📁 Folder Structure

```
sql/
├── migrations/      # Schema changes, new tables, columns
├── fixes/          # Bug fixes, data corrections
├── diagnostics/    # Debugging queries, checks
└── archive/        # Old/deprecated scripts
```

---

## 📋 SQL Files to Organize

### ✅ Migrations (sql/migrations/)
Schema changes and new features:
- `FRESH_ACCOUNT_SETUP.sql`
- `ADD_MISSING_DRIVER_COLUMNS.sql`
- `FIX_DRIVER_COLUMNS.sql`
- `SETUP_STORAGE.sql`
- `update_driver_features.sql`

### 🔧 Fixes (sql/fixes/)
Bug fixes and corrections:
- `FIX_AUTH_ADMIN.sql`
- `FIX_AUTH_GRANTS_ONLY.sql`
- `FIX_AUTH_RLS.sql`
- `FIX_DRIVERS_ONLINE.sql`
- `FIX_DRIVER_RLS.sql`
- `FIX_EXTENSIONS.sql`
- `FIX_LOGIN_ERROR_FINAL.sql`
- `FIX_RLS_POLICIES.sql`
- `EMERGENCY_FIX_500.sql`
- `NUCLEAR_FIX.sql`
- `ULTIMATE_FIX.sql`
- `fix_all_users_login.sql`
- `fix_broken_drivers.sql`
- `fix_code_logic.sql`
- `fix_critical_permissions.sql`
- `fix_database_permissions.sql`
- `fix_delete_driver.sql`
- `fix_driver_login.sql`
- `repair_system_final.sql`
- `SANITIZE_DRIVER.sql`
- `DISABLE_RLS_TEST.sql`
- `FINAL_METADATA_FIX.sql`

### 🔍 Diagnostics (sql/diagnostics/)
Debugging and checking queries:
- `CHECK_AUTH_STATUS.sql`
- `CHECK_COMPANY_MATCHING.sql`
- `CHECK_DRIVER_EMAIL.sql`
- `CHECK_DRIVER_ONLINE_STATUS.sql`
- `CHECK_LOGGED_IN_USER.sql`
- `CHECK_LOGIN_UPDATE.sql`
- `CHECK_ORDERS_STATUS.sql`
- `CHECK_ORDER_2.sql`
- `COMPARE_MANAGER_DRIVER.sql`
- `DEEP_CHECK.sql`
- `DEEP_DIAGNOSTIC.sql`
- `FIND_HIDDEN_HOOKS.sql`
- `FIND_HOOKS.sql`
- `GET_TRIGGER_SOURCE.sql`
- `VERIFY_LOGIN_DB.sql`
- `VERIFY_LOGIN_FIX.sql`
- `FINAL_VERIFICATION.sql`
- `check_auth_rls.sql`
- `check_public_users_rls.sql`
- `check_triggers.sql`
- `compare_accounts.sql`
- `debug_user.sql`
- `diagnose_auth_triggers.sql`
- `full_diagnostic.sql`
- `simple_rls_check.sql`

### 🗄️ Archive (sql/archive/)
Temporary test scripts or old versions:
- `TEST_AUTH_DIRECT.sql`
- `TEST_AUTH_ROLE.sql`
- `TEST_AUTH_ROLE_VISIBLE.sql`
- `TEST_GHOST_USER.sql`
- `MANUAL_USER_TEST.sql`
- `SIMULATE_LOGIN.sql`
- `SIMULATE_LOGIN_VISIBLE.sql`
- `GEOCODE_MISSING_ORDERS.sql`
- `LINK_NEW_USER.sql`
- `CREATE_ACTIVITY_LOGS.sql` (if already in supabase/)

---

## 🚀 How to Organize

### Option 1: Manual (Recommended)
```powershell
# Review each file first, then move
Move-Item "FIX_AUTH_ADMIN.sql" "sql\fixes\"
Move-Item "CHECK_AUTH_STATUS.sql" "sql\diagnostics\"
# etc...
```

### Option 2: Bulk Move (Advanced)
```powershell
# Move all FIX_* files
Move-Item "FIX_*.sql" "sql\fixes\"

# Move all CHECK_* files  
Move-Item "CHECK_*.sql" "sql\diagnostics\"

# Move all TEST_* files
Move-Item "TEST_*.sql" "sql\archive\"
```

---

## ⚠️ Before Moving

1. **Review each file** - Make sure you know what it does
2. **Check if it's referenced** - Search codebase for filename
3. **Keep supabase/ folder** - Don't move files from supabase/
4. **Backup first** - Git commit before moving files

---

## ✅ After Organizing

Update these files to reference new locations:
- Documentation (if SQL files are mentioned)
- Any scripts that reference these files

---

**Last Updated:** February 3, 2026
