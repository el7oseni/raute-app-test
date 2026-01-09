
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

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
        }

        // Delete Auth User (Cascades to public.users usually, or we delete manually)
        // We will try deleting Auth user first.
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)

        if (authError) {
            console.error('Auth Delete Error:', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // Just in case cascade isn't set up perfectly or works differently
        const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', id)

        // We ignore dbError as it might have already been deleted by cascade

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, name, email, password, permissions } = body

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

        // 1. Update Auth User (Email/Password)
        const authUpdates: any = {}
        if (email) authUpdates.email = email
        if (password && password.length > 0) authUpdates.password = password

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
            if (authError) throw authError
        }

        // 2. Update Profile (Name/Permissions)
        const profileUpdates: any = {}
        if (name) profileUpdates.full_name = name
        if (permissions) profileUpdates.permissions = permissions

        if (Object.keys(profileUpdates).length > 0) {
            const { error: dbError } = await supabaseAdmin
                .from('users')
                .update(profileUpdates)
                .eq('id', id)

            if (dbError) throw dbError
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Update Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
