import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // 1. Validate Environment Variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json(
                { error: 'Server Misconfigured: Missing Supabase Keys' },
                { status: 500 }
            )
        }

        // 2. Initialize Admin Client
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 3. Parse Body
        const { driverId, newPassword } = await request.json()

        if (!driverId || !newPassword) {
            return NextResponse.json(
                { error: 'Driver ID and New Password are required' },
                { status: 400 }
            )
        }

        // 4. Get Driver's User ID
        const { data: driver, error: driverError } = await supabaseAdmin
            .from('drivers')
            .select('user_id, email')
            .eq('id', driverId)
            .single()

        if (driverError || !driver) {
            return NextResponse.json(
                { error: 'Driver not found' },
                { status: 404 }
            )
        }

        if (!driver.user_id) {
            return NextResponse.json(
                { error: 'Driver is not linked to a user account' },
                { status: 400 }
            )
        }

        // 5. Update Password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            driver.user_id,
            { password: newPassword }
        )

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully'
        })

    } catch (error: any) {
        console.error('Update Password Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
