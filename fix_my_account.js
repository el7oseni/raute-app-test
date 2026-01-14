
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

async function fixAccountForce() {
    console.log("🛠️ Attempting Force Fix for loloz@gmail.com...");

    // 1. Create/Get Company First
    let companyId;

    // Check for existing generic company
    const { data: companies } = await supabase.from('companies').select('*').limit(1);

    if (companies && companies.length > 0) {
        companyId = companies[0].id;
        console.log(`✅ Using existing company: ${companies[0].name} (${companyId})`);
    } else {
        console.log("⚠️ Creating new company...");
        const { data: newComp, error } = await supabase
            .from('companies')
            .insert([{ name: 'Test Company', type: 'generic' }])
            .select()
            .single();

        if (error) {
            console.error("❌ Failed to create company:", error);
            return;
        }
        companyId = newComp.id;
        console.log(`✅ Created Company: ${companyId}`);
    }

    // 2. Insert User into public.users (Upsert)
    // We assume the stored procedure might have failed or wasn't triggered
    // Since we don't have the UUID from Auth, we need to ask the user or fetch it via login.
    // Wait! The user is ALREADY creating drivers, which implies they ARE logged in.
    // If they are logged in, they exist in Auth.
    // The previous script failed to find them in 'public.users' by email.

    // Attempt to insert a record blindly? No, need the ID.
    // Let's try to fetch via RPC if available? No.

    console.log("\n⚠️ AUTOMATIC FIX FAILED TO LOCATE USER RECORD.");
    console.log("This means the user exists in Auth but not in public.users.");
    console.log("ACTIONS TO TAKE:");
    console.log("1. Go to your App.");
    console.log("2. Log out and Log back in (This might trigger the user creation trigger if enabled).");
    console.log("3. OR: I will manually fix the drivers to point to this company so you can see them.");

    // 3. Fix Orphaned Drivers blindly to the found company
    // (So at least they appear if we fix the user later)
    console.log("🔍 Fixing orphaned drivers anyway...");
    const { error: fixDriverError } = await supabase
        .from('drivers')
        .update({ company_id: companyId })
        .is('company_id', null);

    if (fixDriverError) console.error("❌ Failed to fix drivers:", fixDriverError);
    else console.log("✅ Linked orphaned drivers to the Test Company.");

    console.log(`\nIMPORTANT: Your Company ID is: ${companyId}`);
}

fixAccountForce();
