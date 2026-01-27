import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: Request) {
    try {
        // Initialize Admin Client (deferred to runtime to avoid build errors)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Verify Request
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 2. Delete User from Auth (This should cascade to public tables if FK is set)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error('Supabase Delete Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Success
        return NextResponse.json({ message: 'Account deleted successfully' });

    } catch (error) {
        console.error('Delete Account System Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
