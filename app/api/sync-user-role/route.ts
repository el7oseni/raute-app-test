import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with Service Role Key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    }
)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }

        // 1. Get the user's role and company_id from public.users
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('role, company_id')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found in public.users', details: userError?.message },
                { status: 404 }
            )
        }

        // 2. Update auth.users raw_user_meta_data with the correct role
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
                role: user.role,
                company_id: user.company_id,
            }
        })

        if (updateError) {
            console.error('sync-user-role: failed to update metadata:', updateError.message)
            return NextResponse.json(
                { error: 'Failed to sync role', details: updateError.message },
                { status: 500 }
            )
        }

        console.log(`✅ Synced role for user ${userId}: role=${user.role}, company_id=${user.company_id}`)

        return NextResponse.json({
            success: true,
            role: user.role,
            company_id: user.company_id,
        })
    } catch (err) {
        console.error('sync-user-role unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
