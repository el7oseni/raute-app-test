
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase Admin Client
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

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const {
            email,
            password,
            fullName,
            companyId,
            phone,
            vehicleType,
            defaultStartLoc,
            customValues
        } = body

        if (!email || !password || !fullName || !companyId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        console.log(`🚀 Creating driver account for: ${email}`)

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: 'driver',
                company_id: companyId
            }
        })

        if (authError) {
            console.error('❌ Auth Create Error:', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const userId = authData.user.id
        console.log(`✅ Auth User Created: ${userId}`)

        // 2. Insert into public.users (explicit sync)
        // Note: Triggers might handle this, but explicit is safer for initial setup
        const { error: userError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email,
                full_name: fullName,
                role: 'driver',
                company_id: companyId,
                phone,
                status: 'active'
            })

        if (userError) {
            console.error('❌ Public User Error:', userError)
            // Rollback auth user? tough in stateless, but ideally yes.
            return NextResponse.json({ error: 'Failed to create user profile: ' + userError.message }, { status: 500 })
        }

        // 3. Insert into public.drivers
        const { error: driverError } = await supabaseAdmin
            .from('drivers')
            .insert({
                user_id: userId,
                company_id: companyId,
                name: fullName, // legacy field
                vehicle_type: vehicleType,
                default_start_address: defaultStartLoc?.address,
                default_start_lat: defaultStartLoc?.lat,
                default_start_lng: defaultStartLoc?.lng,
                custom_data: customValues
            })

        if (driverError) {
            console.error('❌ Driver Profile Error:', driverError)
            return NextResponse.json({ error: 'Failed to create driver profile: ' + driverError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, userId })
    } catch (error: any) {
        console.error('🔥 Server Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
