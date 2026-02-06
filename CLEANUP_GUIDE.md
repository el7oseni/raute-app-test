# 🧹 Project Cleanup Guide

Quick guide for cleaning up and organizing the project.

---

## 📁 Files to Review/Remove

### 🗑️ Backup Folders (Optional Cleanup)

These folders contain old code backups:

```
_api_backup/          # Old API route backups
_auth_backup/         # Old auth component backups
api_backup/           # Another API backup folder
```

**Options:**
1. **Keep as reference** - If you might need old code
2. **Move to archive/** - Create archive/ folder
3. **Delete** - If you're confident don't need them

**Command to move:**
```powershell
New-Item -ItemType Directory -Path "archive" -Force
Move-Item "_api_backup" "archive\"
Move-Item "_auth_backup" "archive\"
Move-Item "api_backup" "archive\"
```

**Command to delete:**
```powershell
Remove-Item "_api_backup" -Recurse -Force
Remove-Item "_auth_backup" -Recurse -Force
Remove-Item "api_backup" -Recurse -Force
```

---

### 📄 Unused Files

Review these files - may be safe to delete:

```
temp_remote.txt              # Temporary file (175 KB)
android.zip                  # Old Android backup?
```

**Check before deleting:**
```powershell
# View file to see if important
Get-Content "temp_remote.txt" | Select-Object -First 20
```

---

### 🧪 Test Scripts (Root Directory)

These might belong in `scripts/` or `sql/archive/`:

```javascript
check_auth_exports.js
check_users.js
fix_driver_auth.js
fix_king_account.js
fix_my_account.js
steal_driver.js
```

**Organize:**
```powershell
# Move to scripts/ if still needed
Move-Item "*.js" "scripts\" -Exclude "*.config.js"

# Or move to archive
Move-Item "fix_*.js" "archive\"
```

---

### 📝 PowerShell Scripts

Root directory PowerShell scripts:

```powershell
manual_fix_signup.ps1
test_login.ps1
verify_auth_api.ps1
verify_rpc_login.ps1
```

**Options:**
1. Move to `scripts/` folder
2. Keep if actively using
3. Archive if old

---

## ✅ Cleanup Checklist

- [ ] **SQL Files** - Organized into sql/ subfolders (see sql/README.md)
- [ ] **Backup folders** - Moved to archive/ or deleted
- [ ] **Test scripts** - Organized or archived
- [ ] **Temp files** - Reviewed and cleaned
- [ ] **PowerShell scripts** - Organized in scripts/
- [ ] **.env.example** - Created ✅
- [ ] **Git commit** - After cleanup

---

## 🔒 Files to NEVER Delete

These are critical:

```
.env.local                    # Your environment
.git/                         # Git repository
node_modules/                 # Dependencies
.next/                        # Next.js build
supabase/                     # Database schemas
app/                          # Application code
components/                   # UI components
lib/                          # Utilities
```

---

## 🚀 Recommended Cleanup Flow

```powershell
# 1. Create archive folder
New-Item -ItemType Directory -Path "archive" -Force

# 2. Git commit current state (safety!)
git add .
git commit -m "chore: before cleanup"

# 3. Organize SQL files (see sql/README.md)
# Move files one by one or in batches

# 4. Move backup folders
Move-Item "_*_backup" "archive\"
Move-Item "api_backup" "archive\"

# 5. Review and remove temp files
Remove-Item "temp_remote.txt" -Force

# 6. Git commit cleanup
git add .
git commit -m "chore: project cleanup and organization"
```

---

## 📊 Expected Results

### Before:
```
raute-app/
├── 120+ SQL files in root
├── 3 backup folders
├── Various test scripts
└── Temp files
```

### After:
```
raute-app/
├── sql/
│   ├── migrations/
│   ├── fixes/
│   ├── diagnostics/
│   └── archive/
├── scripts/ (organized)
├── archive/ (old backups)
└── Clean root directory ✅
```

---

## ⚠️ Safety Tips

1. **Always commit before cleanup** - Easy to undo
2. **Review files before deleting** - Better safe than sorry
3. **Test after cleanup** - Make sure app still works
4. **Keep backups** - At least temporarily

---

**Last Updated:** February 3, 2026
