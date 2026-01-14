
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function forceTransportDriver() {
    console.log("🕵️ Investigating driver5...");

    // 1. Get King's ID
    const { data: kingUser } = await supabase.from('users').select('company_id').eq('email', 'king@gmail.com').single();
    const kingCompanyId = kingUser.company_id;
    console.log(`👑 King's Company: ${kingCompanyId}`);

    // 2. Find driver5 (or any driver created recently)
    // We'll search by checking users table for email 'driver5@gmail.com' and getting the linked driver
    // OR search driver name if you input 'driver5' as name.

    // Let's search by name 'driver5' or similar in drivers table directly first
    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('*'); // Get all temporarily to filter in JS (small DB assumed)

    if (drivers) {
        // Filter loosely
        const target = drivers.find(d => d.name === 'driver5' || d.name === 'Driver 5' || d.name === 'driver5@gmail.com' || (d.custom_data && JSON.stringify(d.custom_data).includes('driver5')));

        if (target) {
            console.log(`🚚 Found Driver: ${target.name} (ID: ${target.id})`);
            console.log(`   Current Company: ${target.company_id}`);

            if (target.company_id !== kingCompanyId) {
                console.log("⚠️ Driver is in the WRONG company! Moving to King's company...");
                const { error: moveError } = await supabase
                    .from('drivers')
                    .update({ company_id: kingCompanyId })
                    .eq('id', target.id);

                if (moveError) console.error("❌ Failed to move:", moveError);
                else console.log("✅ Driver moved to King's company successfully.");

                // Also fix the user record if exists
                if (target.user_id) {
                    await supabase.from('users').update({ company_id: kingCompanyId }).eq('id', target.user_id);
                    console.log("✅ Linked User record updated too.");
                }
            } else {
                console.log("✅ Driver is ALREADY in King's company. Why is it not showing?");
            }
        } else {
            // Try to find by User email?
            const { data: userDriver } = await supabase.from('users').select('id, full_name, email, company_id').eq('email', 'driver5@gmail.com').single();
            if (userDriver) {
                console.log(`👤 Found User 'driver5@gmail.com'. Company: ${userDriver.company_id}`);
                if (userDriver.company_id !== kingCompanyId) {
                    console.log("⚠️ User found but wrong company. Updating...");
                    await supabase.from('users').update({ company_id: kingCompanyId }).eq('id', userDriver.id);
                    // Update driver table too
                    await supabase.from('drivers').update({ company_id: kingCompanyId }).eq('user_id', userDriver.id);
                    console.log("✅ Fixed via User record.");
                }
            } else {
                console.log("❌ Could not find 'driver5' in drivers OR users table.");
            }
        }
    }
}

forceTransportDriver();
