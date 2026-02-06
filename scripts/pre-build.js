#!/usr/bin/env node

/**
 * 🧪 Pre-Build Validation Script
 * Runs all necessary checks before building the application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

console.log(`\n${colors.blue}🧪 Running Pre-Build Validation...${colors.reset}\n`);

let hasErrors = false;
let hasWarnings = false;

// Check 1: Environment Variables
console.log(`${colors.magenta}1️⃣ Checking Environment Variables...${colors.reset}`);
try {
    execSync('node scripts/verify-env.js', { stdio: 'inherit' });
    console.log(`${colors.green}   ✅ Environment variables validated${colors.reset}\n`);
} catch (error) {
    console.log(`${colors.red}   ❌ Environment validation failed${colors.reset}\n`);
    hasErrors = true;
}

// Check 2: TypeScript Compilation
console.log(`${colors.magenta}2️⃣ Checking TypeScript...${colors.reset}`);
try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log(`${colors.green}   ✅ TypeScript compilation successful${colors.reset}\n`);
} catch (error) {
    console.log(`${colors.red}   ❌ TypeScript errors found${colors.reset}\n`);
    hasErrors = true;
}

// Check 3: ESLint
console.log(`${colors.magenta}3️⃣ Running Linter...${colors.reset}`);
try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log(`${colors.green}   ✅ Linting passed${colors.reset}\n`);
} catch (error) {
    console.log(`${colors.yellow}   ⚠️  Linting warnings found${colors.reset}\n`);
    hasWarnings = true;
}

// Check 4: Next.js Build
console.log(`${colors.magenta}4️⃣ Testing Build...${colors.reset}`);
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log(`${colors.green}   ✅ Build successful${colors.reset}\n`);
} catch (error) {
    console.log(`${colors.red}   ❌ Build failed${colors.reset}\n`);
    hasErrors = true;
}

// Check 5: Dependencies
console.log(`${colors.magenta}5️⃣ Checking Dependencies...${colors.reset}`);
try {
    execSync('npm audit --audit-level=high', { stdio: 'pipe' });
    console.log(`${colors.green}   ✅ No high-severity vulnerabilities${colors.reset}\n`);
} catch (error) {
    console.log(`${colors.yellow}   ⚠️  Security vulnerabilities found (run npm audit)${colors.reset}\n`);
    hasWarnings = true;
}

// Check 6: Git Status
console.log(`${colors.magenta}6️⃣ Checking Git Status...${colors.reset}`);
try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
        console.log(`${colors.yellow}   ⚠️  Uncommitted changes detected${colors.reset}\n`);
        hasWarnings = true;
    } else {
        console.log(`${colors.green}   ✅ Working directory clean${colors.reset}\n`);
    }
} catch (error) {
    console.log(`${colors.blue}   ℹ️  Not a git repository${colors.reset}\n`);
}

// Final Summary
console.log(`${colors.magenta}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.magenta}📊 Pre-Build Validation Summary${colors.reset}`);
console.log(`${colors.magenta}═══════════════════════════════════════${colors.reset}\n`);

if (hasErrors) {
    console.log(`${colors.red}❌ Validation FAILED${colors.reset}`);
    console.log(`${colors.red}Fix the errors above before deploying.${colors.reset}\n`);
    process.exit(1);
} else if (hasWarnings) {
    console.log(`${colors.yellow}⚠️  Validation PASSED with warnings${colors.reset}`);
    console.log(`${colors.yellow}Review warnings before deploying.${colors.reset}\n`);
    process.exit(0);
} else {
    console.log(`${colors.green}✅ All checks PASSED${colors.reset}`);
    console.log(`${colors.green}Ready for deployment! 🚀${colors.reset}\n`);
    process.exit(0);
}
