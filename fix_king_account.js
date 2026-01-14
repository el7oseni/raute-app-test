
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase keys");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixKingAccount() {
    console.log("👑 Fixing account for KING (king@gmail.com)...");

    // 1. Get King's Company ID
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'king@gmail.com');

    if (error || !users || users.length === 0) {
        console.error("❌ King user not found via API. Are you sure 'king@gmail.com' exists in public.users?", error);
        return;
    }

    const king = users[0];
    const companyId = king.company_id;
    console.log(`✅ Found King: ${king.full_name}`);
    console.log(`   Company ID: ${companyId}`);

    if (!companyId) {
        console.error("❌ King has no Company ID! This is unexpected for a Manager.");
        // Create one? Or find 'lo'?
        return;
    }

    // 2. Fix Orphaned Drivers (especially driver5)
    console.log("🔍 Looking for orphaned drivers to assign to King's company...");

    // Find drivers with NO company
    const { data: orphans } = await supabase
        .from('drivers')
        .select('id, name')
        .is('company_id', null);

    if (orphans && orphans.length > 0) {
        console.log(`⚠️ Found ${orphans.length} orphaned drivers (including ${orphans.map(d => d.name).join(', ')}).`);
        console.log("🛠️ Linking them to King's company now...");

        const { error: updateError } = await supabase
            .from('drivers')
            .update({ company_id: companyId })
            .is('company_id', null);

        if (updateError) console.error("❌ Failed to update drivers:", updateError);
        else console.log("✅ SUCCESS! All orphaned drivers are now linked to King.");
    } else {
        console.log("✅ No orphaned drivers found. Checking if they belong to another company...");
    }
}

fixKingAccount();
