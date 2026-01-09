
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin Client (Service Role)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { name, email, password, companyId, permissions } = body

        if (!name || !email || !password || !companyId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // 1. Create Auth User
        let userId: string

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'dispatcher' }
        })

        if (authError) {
            // Handle "User already registered" case
            if (authError.message.includes('already been registered') || authError.status === 422) {
                console.log('User exists, attempting to link/update...')

                // Fetch existing user to get ID
                // listUsers returns a paginated list, filtering by email is not directly supported as a simple arg in older versions, 
                // but newer Supabase JS does support it. Safest is ensuring we get the specific user.
                // admin.listUsers() doesn't filter by email effectively in all versions. 
                // Getting user by email is not explicitly "getUserByEmail" in admin api. 
                // We'll rely on the error, but we need the ID.
                // Wait, creating user fails, so we can't get ID from authData.

                // WORKAROUND: We can't easily "get" a user by email via Admin API without listing.
                // NOTE: Supabase Admin `listUsers` allows no email filter. 
                // However, we can use `supabaseAdmin.from('auth.users').select('id').eq('email', email)` if we had access, but we don't via JS client easily.

                // Let's try to update using updatePage or listUsers with a search?
                // Actually, listUsers does not support email filtering perfectly.

                // ALTERNATIVE: Use `inviteUserByEmail`? No.

                // Let's assume we can proceed if we find the user via `listUsers` (might be slow if thousands of users, but we are small scale).
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

                if (listError) return NextResponse.json({ error: 'Failed to check existing users' }, { status: 500 })

                const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

                if (!existingUser) {
                    return NextResponse.json({ error: 'Email registered but user not found. Database inconsistency.' }, { status: 500 })
                }

                userId = existingUser.id

                // Update password to match what the manager just set
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: password,
                    user_metadata: { role: 'dispatcher' }
                })

            } else {
                console.error('Auth Create Error:', authError)
                return NextResponse.json({ error: authError.message }, { status: 400 })
            }
        } else {
            userId = authData.user.id
        }

        // 2. Insert into 'users' table (Profile)
        // Note: 'users' table RLs is disabled for checking, but we use admin client anyway.
        // We explicitly set role='dispatcher' and store permissions json
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email: email,
                full_name: name,
                company_id: companyId,
                role: 'dispatcher',
                permissions: permissions || {}, // Store granular permissions
                status: 'active'
            })

        if (profileError) {
            // Rollback Auth User if profile creation fails? 
            // Ideally yes, but for MVP we just error.
            console.error('Profile Create Error:', profileError)
            return NextResponse.json({ error: 'Failed to create dispatcher profile: ' + profileError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            userId,
            credentials: { email, password }
        })

    } catch (error: any) {
        console.error('Server Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
