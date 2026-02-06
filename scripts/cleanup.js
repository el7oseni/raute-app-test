#!/usr/bin/env node

/**
 * 🧹 Cleanup Script
 * Removes build artifacts and temporary files
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

console.log(`\n${colors.blue}🧹 Cleaning up project...${colors.reset}\n`);

const pathsToClean = [
    '.next',
    'out',
    'node_modules/.cache',
    '.turbo',
    'dist',
];

let cleanedCount = 0;

pathsToClean.forEach(dirPath => {
    const fullPath = path.join(process.cwd(), dirPath);

    if (fs.existsSync(fullPath)) {
        try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`${colors.green}✅ Removed: ${dirPath}${colors.reset}`);
            cleanedCount++;
        } catch (error) {
            console.log(`${colors.yellow}⚠️  Could not remove: ${dirPath}${colors.reset}`);
        }
    } else {
        console.log(`${colors.blue}ℹ️  Not found: ${dirPath}${colors.reset}`);
    }
});

console.log(`\n${colors.green}🎉 Cleanup complete! Removed ${cleanedCount} directories.${colors.reset}`);
console.log(`${colors.yellow}💡 Run 'npm install' if you removed node_modules${colors.reset}\n`);
