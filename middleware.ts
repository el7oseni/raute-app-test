import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Force HTTPS redirect (before any other checks)
    const proto = request.headers.get('x-forwarded-proto')
    if (proto === 'http') {
        const url = request.nextUrl.clone()
        url.protocol = 'https:'
        return NextResponse.redirect(url, 301)
    }

    // Skip middleware entirely for landing page and marketing pages
    const marketingPages = ['/', '/privacy', '/terms']
    if (marketingPages.includes(request.nextUrl.pathname)) {
        return NextResponse.next()
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const isEmailVerified = session?.user?.email_confirmed_at

    // Enhanced debug logging for session state
    console.log('🔐 Middleware Auth Check:', {
        path: request.nextUrl.pathname,
        hasSession: !!session,
        userId: session?.user?.id,
        emailVerified: !!isEmailVerified,
        timestamp: new Date().toISOString()
    })

    // 1. PUBLIC ROUTES (Allow access)
    const publicRoutes = ['/login', '/signup', '/verify-email', '/auth/callback', '/pending-activation', '/', '/debug-logs']
    const isPublicRoute = publicRoutes.some(route => {
        // Exact match or match with trailing slash
        return request.nextUrl.pathname === route || request.nextUrl.pathname === `${route}/`
    })

    if (isPublicRoute) {
        return response
    }

    // 2. AUTHENTICATION REQUIRED
    if (!session) {
        console.warn('⛔ No session found. Redirecting to login from:', request.nextUrl.pathname)
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. EMAIL VERIFICATION GATE
    if (!isEmailVerified && request.nextUrl.pathname !== '/verify-email') {
        return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // 4. FETCH USER ROLE FROM DATABASE (CRITICAL SECURITY CHECK)
    const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', session.user.id)
        .single()

    // 🚨 SECURITY: If user not found in database, handle gracefully
    // DO NOT LOGOUT here, as it causes infinite redirect loops if DB is slow or RLS fails.
    if (userFetchError) {
        console.error(`❌ Database fetch error for user ${session.user.id}:`, userFetchError)
    }
    
    if (!userData || !userData.role) {
        console.warn(`⚠️ User ${session.user.id} has no database record or access denied by RLS. Allowing provisional access with 'driver' role.`)
        // Proceed as if role is 'driver' (safest default) or let UI handle it.
        // We do NOT redirect to avoid loops.
    }

    const role = userData?.role || 'driver' // Default to driver if DB fetch fails
    const company_id = userData?.company_id || null


    // Allow access to pending-activation page
    if (request.nextUrl.pathname === '/pending-activation') {
        return response
    }

    // 5. ONBOARDING CHECK (New Managers must create company)
    // If manager has no company, force redirection to onboarding
    // Exclude the onboarding page itself and the API route to prevent loops
    if (role === 'manager' && !company_id) {
        const isOnboardingValues = request.nextUrl.pathname.startsWith('/onboarding') || request.nextUrl.pathname.startsWith('/api/onboarding')

        if (!isOnboardingValues) {
            console.log(`🚀 New Manager detected: ${session.user.id} - Redirecting to Onboarding`)
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }
    }

    // 6. DRIVER ACTIVATION CHECK
    // Check if DRIVER is activated (dispatchers skip this step)
    if (role === 'driver') {
        const { data: driverData } = await supabase
            .from('drivers')
            .select('is_active')
            .eq('user_id', session.user.id)
            .single()

        if (driverData && !driverData.is_active) {
            // Redirect to "waiting for activation" page
            console.warn(`🔒 Inactive Driver: ${session.user.email} - Pending manager activation`)
            return NextResponse.redirect(new URL('/pending-activation', request.url))
        }
    }

    // 7. ROLE-BASED PROTECTION
    // LIST OF MANAGER ONLY ROUTES
    const managerRoutes = ['/planner', '/drivers', '/companies', '/settings']

    if (managerRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
        if (role !== 'manager' && role !== 'admin' && role !== 'dispatcher') {
            // Driver trying to access manager areas
            console.warn(`🚧 Unauthorized Access Blocked: ${role} tried to access ${request.nextUrl.pathname}`)
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * - api - API routes (we might want to protect these differently)
         * - Root path (/) - Landing page
         * - /privacy, /terms - Legal pages
         */
        '/((?!_next/static|_next/image|favicon.ico|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
