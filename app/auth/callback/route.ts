import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/dashboard'

    if (code) {
        // Create a response object first to handle cookies
        // We use the 'next' URL but origin from request to be safe
        let response = NextResponse.redirect(new URL(next, requestUrl.origin))

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // VERY IMPORTANT: Set cookie on the response object
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        // VERY IMPORTANT: Remove cookie from the response object
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                    },
                },
            }
        )

        // Exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth callback error:', error)
            return NextResponse.redirect(new URL('/login?error=verification_failed', requestUrl.origin))
        }

        // Check if user profile exists in database
        if (data.user) {
            try {
                // Ensure the session is set by refreshing it immediately
                await supabase.auth.refreshSession()

                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', data.user.id)
                    .single()

                // If no profile, create one for OAuth users
                if (!profile) {
                    console.log('Creating profile for OAuth user:', data.user.email)

                    const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'

                    // Insert the user profile
                    // We use upsert to avoid race conditions
                    await supabase.from('users').upsert({
                        id: data.user.id,
                        email: data.user.email,
                        full_name: fullName,
                        role: 'manager', // Default role for OAuth signups
                        phone: data.user.user_metadata?.phone || null,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'id' })
                }
            } catch (err) {
                console.error('Error in profile creation:', err)
                // Continue anyway, as the auth session is valid
            }
        }

        return response
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
