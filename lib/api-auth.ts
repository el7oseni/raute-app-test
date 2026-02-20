import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Shared auth helper for API routes.
 * Supports two auth methods:
 * 1. Cookie-based (web) — reads session from Next.js cookies
 * 2. Bearer token (native/Capacitor) — reads Authorization header
 *
 * Returns the authenticated user or null.
 */

let _supabaseAdmin: ReturnType<typeof createClient> | null = null
export function getSupabaseAdmin() {
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

export async function getAuthenticatedUser(request: Request): Promise<{
    id: string
    email?: string
} | null> {
    // Method 1: Try Authorization header (works for both web and native)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
            const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token)
            if (!error && user) {
                return { id: user.id, email: user.email }
            }
        } catch {
            // Fall through to cookie method
        }
    }

    // Method 2: Try cookies (web only)
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll() {
                        // Read-only context: API routes don't need to set cookies
                    },
                },
            }
        )
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!error && user) {
            return { id: user.id, email: user.email }
        }
    } catch {
        // Cookies not available (e.g., in edge runtime)
    }

    return null
}
