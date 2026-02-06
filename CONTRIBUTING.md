# Contributing to Raute 🤝

Thank you for your interest in contributing to Raute! This document provides guidelines and best practices for development.

---

## 📋 Table of Contents

- [Development Setup](#-development-setup)
- [Code Style](#-code-style)
- [Commit Guidelines](#-commit-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Testing](#-testing)

---

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- VS Code (recommended)
- Supabase CLI (optional)

### Setup Steps

```bash
# 1. Clone the repo
git clone <repository-url>
cd raute-app

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Validate environment
node scripts/verify-env.js

# 5. Start dev server
npm run dev
```

---

## 🎨 Code Style

### TypeScript
- Use TypeScript for all new files
- Enable strict mode
- Avoid `any` types when possible

### Naming Conventions
- **Components:** PascalCase (`UserProfile.tsx`)
- **Functions:** camelCase (`getUserData`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Files:** kebab-case for pages (`user-profile.tsx`)

### File Organization
```typescript
// 1. Imports (external first, then internal)
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface UserProps {
  name: string;
}

// 3. Component
export function User({ name }: UserProps) {
  return <div>{name}</div>;
}
```

---

## 📝 Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples
```bash
git commit -m "feat(orders): add bulk delete functionality"
git commit -m "fix(auth): resolve login redirect loop"
git commit -m "docs(readme): update installation steps"
```

---

## 🔄 Pull Request Process

### Before Creating PR

1. **Update from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run checks**
   ```bash
   npm run lint
   npm run build
   node scripts/verify-env.js
   ```

3. **Test locally**
   - Verify feature works as expected
   - Check mobile responsiveness
   - Test on iOS/Android if applicable

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Tested on mobile
- [ ] Added tests (if applicable)

## Screenshots
(if applicable)
```

---

## 🧪 Testing

### Manual Testing Checklist

**For All Changes:**
- [ ] Works in Chrome, Safari, Firefox
- [ ] Mobile responsive (test on actual device if possible)
- [ ] No console errors
- [ ] Accessible (keyboard navigation, screen readers)

**For Auth Changes:**
- [ ] Test login/logout flow
- [ ] Test with different roles (manager/driver)
- [ ] Test RLS policies

**For Map/Location Changes:**
- [ ] Test with real GPS coordinates
- [ ] Test offline behavior
- [ ] Test on iOS and Android

---

## 🚀 Deployment

### Environment Variables
Never commit `.env.local` or API keys. Use:
- `ENV_VARIABLES_REFERENCE.md` (gitignored)
- Appflow Secrets for builds

### Build Validation
```bash
# Validate before deployment
npm run build
node scripts/verify-env.js
```

---

## 📞 Getting Help

- **Questions:** Open a GitHub issue
- **Bugs:** Create detailed bug report
- **Feature Requests:** Submit enhancement issue

---

## ✅ Code Review Checklist

Reviewers should check:
- [ ] Code follows style guidelines
- [ ] No hardcoded credentials
- [ ] Proper error handling
- [ ] TypeScript types are correct
- [ ] Comments explain complex logic
- [ ] No unnecessary console.logs
- [ ] Mobile-friendly UI

---

## 🙏 Thank You!

Your contributions make Raute better for everyone. We appreciate your time and effort! 💙

---

**Last Updated:** February 3, 2026
