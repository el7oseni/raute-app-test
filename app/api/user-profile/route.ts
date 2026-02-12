import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy-init: avoid crash at build time when env vars are not set
let _supabaseAdmin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
    if (!_supabaseAdmin) {
        _supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                }
            }
        )
    }
    return _supabaseAdmin
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }

        // Validate userId format (basic UUID check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(userId)) {
            return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 })
        }

        // Fetch user profile using admin client (bypasses RLS)
        const { data: user, error } = await getSupabaseAdmin()
            .from('users')
            .select('id, email, role, company_id, full_name, status, permissions')
            .eq('id', userId)
            .single() as { data: { id: string; email: string; role: string; company_id: string; full_name: string; status: string; permissions: string } | null; error: { message: string } | null }

        if (error || !user) {
            console.error('user-profile API error:', error?.message)
            return NextResponse.json(
                { error: 'User not found', details: error?.message },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                company_id: user.company_id,
                full_name: user.full_name,
                status: user.status,
                permissions: user.permissions,
            }
        })
    } catch (err) {
        console.error('user-profile API unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
