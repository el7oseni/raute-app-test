import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        console.log("🚀 [API] Create Driver Request Started")

        // 1. Validate Environment Variables (Prevent Crash)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
            console.error("❌ Critical: Missing Supabase Environment Variables")
            return NextResponse.json(
                { error: 'Server Misconfigured: Missing Supabase Keys (Check Vercel Env Vars)' },
                { status: 500 }
            )
        }

        // 2. Initialize Admin Client Safely (Inside handler to catch errors)
        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // 3. Parse Body
        let body;
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON Body' }, { status: 400 })
        }

        const { name, email, password, phone, vehicleType, companyId, customValues, defaultStartAddress, defaultStartLat, defaultStartLng } = body

        console.log(`📦 Processing Creation for: ${email}`)

        // 4. Validate Inputs
        if (!name || !email || !password || !companyId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Step 1: Create Auth User (NO triggers will interfere)
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: name,
            }
        })

        if (authError || !newAuthUser.user) {
            console.error('❌ Auth creation error:', authError)
            return NextResponse.json(
                { error: authError?.message || 'Failed to create user account' },
                { status: 500 }
            )
        }

        const userId = newAuthUser.user.id
        console.log("✅ Auth User Created:", userId)

        try {
            // Step 2: Create User Profile (using upsert to handle potential auto-triggers)
            const { error: userInsertError } = await supabaseAdmin
                .from('users')
                .upsert({
                    id: userId,
                    email,
                    full_name: name,
                    role: 'driver',
                    company_id: companyId
                })

            if (userInsertError) {
                console.error('❌ User profile creation error:', userInsertError)
                await supabaseAdmin.auth.admin.deleteUser(userId)
                return NextResponse.json(
                    { error: 'Failed to create user profile: ' + userInsertError.message },
                    { status: 500 }
                )
            }

            // Step 3: Create Driver Record (using admin client to bypass RLS)
            const { error: driverError } = await supabaseAdmin
                .from('drivers')
                .insert({
                    company_id: companyId,
                    user_id: userId,
                    email,
                    name,
                    phone: phone || null,
                    vehicle_type: vehicleType || null,
                    status: 'active',
                    is_online: false,
                    custom_values: customValues || {},
                    default_start_address: defaultStartAddress || null,
                    default_start_lat: defaultStartLat || null,
                    default_start_lng: defaultStartLng || null
                })

            if (driverError) {
                console.error('❌ Driver creation error:', driverError)
                await supabaseAdmin.from('users').delete().eq('id', userId)
                await supabaseAdmin.auth.admin.deleteUser(userId)
                return NextResponse.json(
                    { error: 'Failed to create driver record: ' + driverError.message },
                    { status: 500 }
                )
            }

            // Success!
            console.log("✅ Driver Full Account Created Successfully")
            return NextResponse.json({
                success: true,
                message: 'Driver account created successfully',
                credentials: {
                    email,
                    password
                }
            })

        } catch (dbError: any) {
            console.error('❌ Database error:', dbError)
            await supabaseAdmin.auth.admin.deleteUser(userId)
            return NextResponse.json(
                { error: 'Database error: ' + dbError.message },
                { status: 500 }
            )
        }

    } catch (error: any) {
        console.error('🔥 Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error: ' + (error.message || error) },
            { status: 500 }
        )
    }
}
