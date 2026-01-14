const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY; // Must be Service Role Key to create auth users

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase keys (Need SUPABASE_SERVICE_ROLE_KEY) in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDriverAuth() {
    const email = 'driver5@gmail.com';
    const password = '12345678';

    console.log(`🔍 Checking Auth User for: ${email}`);

    // 1. Check if Auth User exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("❌ Error listing users:", listError);
        return;
    }

    const existingAuthUser = users.find(u => u.email === email);

    if (existingAuthUser) {
        console.log(`✅ Auth User already exists (ID: ${existingAuthUser.id})`);
        // Maybe update password to be sure?
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingAuthUser.id,
            { password: password }
        );
        if (updateError) console.error("⚠️ Failed to update password:", updateError);
        else console.log("✅ Password reset to 12345678");

        // Sync public.users ID
        await syncPublicUser(existingAuthUser.id, email);
    } else {
        console.log(`⚠️ Auth User MISSING. Creating now...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });

        if (createError) {
            console.error("❌ Failed to create auth user:", createError);
            return;
        }

        console.log(`✅ Created Auth User (ID: ${newUser.user.id})`);

        // Sync public.users ID
        await syncPublicUser(newUser.user.id, email);
    }
}

async function syncPublicUser(authId, email) {
    console.log(`🔄 Syncing public.users for ${email}...`);

    // Find the public user
    const { data: publicUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (fetchError || !publicUsers || publicUsers.length === 0) {
        console.error("❌ Public user not found! This is weird if we saw him in the list.");
        return;
    }

    const publicUser = publicUsers[0];

    if (publicUser.id === authId) {
        console.log("✅ IDs already match in public.users.");
        return;
    }

    console.log(`⚠️ Mismatch! Public ID: ${publicUser.id} vs Auth ID: ${authId}`);
    console.log("🛠️ Updating public.users ID to match Auth ID...");

    // We can't easily update the Primary Key (id) if it's referenced elsewhere (drivers table).
    // Strategy:
    // 1. Update 'drivers' table to point to the new Auth ID.
    // 2. Delete the old public user (or update its ID if cascade allows, but update ID is hard).
    // BETTER: Since 'id' is PK, we update the referenced tables first.

    // 1. Update Drivers table
    const { error: driverUpdateError } = await supabase
        .from('drivers')
        .update({ user_id: authId })
        .eq('user_id', publicUser.id);

    if (driverUpdateError) {
        console.error("❌ Failed to update drivers table:", driverUpdateError);
        // If this fails, we can't proceed or we risk orphan data
    } else {
        console.log("✅ Updated drivers table reference.");
    }

    // 2. Update Public User ID? 
    // Actually, usually we just want ONE record.
    // Let's Insert a NEW record with the correct Auth ID, copy data, then delete old?
    // OR: Just update the existing record's ID if Postgres allows (Cascading?).
    // Let's try direct update (might fail due to FKs if not cascaded, but we updated drivers above).

    const { error: idUpdateError } = await supabase
        .from('users')
        .update({ id: authId })
        .eq('email', email); // Use email to target

    if (idUpdateError) {
        console.error("❌ Failed to update public.users ID:", idUpdateError);
        console.log("ℹ️ Attempting Delete/Insert strategy...");

        // If Update failed, maybe delete old and insert new?
        // But wait, we already updated 'drivers' to point to NEW ID (authId).
        // So the old public user has no drivers now.

        // Delete old
        await supabase.from('users').delete().eq('id', publicUser.id);

        // Insert new (or Update if 'UPSERT' logic)
        // Actually, we need a record in public.users with id=authId
        const { error: insertError } = await supabase.from('users').insert({
            id: authId,
            email: publicUser.email,
            full_name: publicUser.full_name,
            role: publicUser.role,
            company_id: publicUser.company_id,
            phone: publicUser.phone,
            status: publicUser.status
        });

        if (insertError) console.error("❌ Failed to insert fixed user record:", insertError);
        else console.log("✅ Inserted correct user record.");

    } else {
        console.log("✅ Successfully updated public.users ID.");
    }
}

fixDriverAuth();
