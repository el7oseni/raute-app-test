
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase Admin Client (Service Role)
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
        const { driverId, userId } = await req.json()

        if (!driverId) {
            return NextResponse.json({ error: 'Driver ID required' }, { status: 400 })
        }

        console.log(`Deleting driver: ${driverId}, User: ${userId}`)

        // 1. Unassign orders (optional, but good practice before delete)
        // RLS might block this if done via client, but here we are admin.
        const { error: unassignError } = await supabaseAdmin
            .from('orders')
            .update({ driver_id: null })
            .eq('driver_id', driverId)

        if (unassignError) console.error('Error unassigning orders:', unassignError)

        // 2. Delete from 'drivers' table (Public table)
        // This usually cascades or we do it manually. Let's do it manually to be safe.
        const { error: deleteDriverError } = await supabaseAdmin
            .from('drivers')
            .delete()
            .eq('id', driverId)

        if (deleteDriverError) {
            console.error('Error deleting driver record:', deleteDriverError)
            return NextResponse.json({ error: deleteDriverError.message }, { status: 500 })
        }

        // 3. Delete from 'auth.users' (The critical part for 'Email already registered')
        if (userId) {
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

            if (deleteAuthError) {
                console.error('Error deleting auth user:', deleteAuthError)
                // We don't fail the whole request if this fails (e.g. user already gone), but we log it.
            } else {
                console.log('Auth user deleted successfully')
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete driver API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
