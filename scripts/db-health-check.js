#!/usr/bin/env node

/**
 * 🔍 Database Health Check Script
 * Validates Supabase connection and basic functionality
 */

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

async function checkDatabase() {
    console.log(`\n${colors.blue}🔍 Database Health Check...${colors.reset}\n`);

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log(`${colors.red}❌ Missing Supabase credentials${colors.reset}`);
        console.log(`${colors.yellow}💡 Run: node scripts/verify-env.js${colors.reset}\n`);
        process.exit(1);
    }

    try {
        // Dynamic import to avoid issues
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`${colors.magenta}1️⃣ Checking Connection...${colors.reset}`);

        // Test connection with a simple query
        const { data, error } = await supabase
            .from('companies')
            .select('count')
            .limit(1);

        if (error) {
            console.log(`${colors.red}   ❌ Connection failed: ${error.message}${colors.reset}\n`);
            process.exit(1);
        }

        console.log(`${colors.green}   ✅ Database connected${colors.reset}\n`);

        // Check tables existence
        console.log(`${colors.magenta}2️⃣ Checking Tables...${colors.reset}`);
        const tables = ['companies', 'users', 'drivers', 'orders'];

        for (const table of tables) {
            const { error: tableError } = await supabase
                .from(table)
                .select('count')
                .limit(1);

            if (tableError) {
                console.log(`${colors.red}   ❌ Table '${table}' not accessible${colors.reset}`);
            } else {
                console.log(`${colors.green}   ✅ Table '${table}' accessible${colors.reset}`);
            }
        }

        console.log(`\n${colors.magenta}3️⃣ Checking Auth Status...${colors.reset}`);
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            console.log(`${colors.green}   ✅ User logged in: ${session.user.email}${colors.reset}\n`);
        } else {
            console.log(`${colors.blue}   ℹ️  No active session${colors.reset}\n`);
        }

        console.log(`${colors.green}✅ Database health check complete!${colors.reset}\n`);
        process.exit(0);

    } catch (error) {
        console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
        process.exit(1);
    }
}

checkDatabase();
