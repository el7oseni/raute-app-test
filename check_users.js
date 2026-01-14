
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log("📋 Users in 'public.users' table:");
    const { data: publicUsers, error } = await supabase.from('users').select('email, role, company_id, full_name');

    if (error) {
        console.error("❌ Error fetching public users:", error.message);
    } else {
        if (publicUsers.length === 0) console.log("   (Table is empty)");
        publicUsers.forEach(u => {
            console.log(`   👤 ${u.email} | Role: ${u.role} | Company: ${u.company_id || '❌ NULL'} | Name: ${u.full_name}`);
        });
    }

    console.log("\n📋 Most recent drivers added:");
    const { data: drivers } = await supabase.from('drivers').select('id, name, company_id').order('created_at', { ascending: false }).limit(3);
    if (drivers) {
        drivers.forEach(d => {
            console.log(`   🚛 Driver: ${d.name} | Company: ${d.company_id || '❌ NULL'}`);
        });
    }
}

listUsers();
