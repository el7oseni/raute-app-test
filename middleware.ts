import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

    // 1. PUBLIC ROUTES (Allow access)
    const publicRoutes = ['/login', '/signup', '/verify-email', '/auth/callback', '/pending-activation', '/']
    const isPublicRoute = publicRoutes.some(route => {
        // Exact match or match with trailing slash
        return request.nextUrl.pathname === route || request.nextUrl.pathname === `${route}/`
    })

    if (isPublicRoute) {
        return response
    }

    // 2. AUTHENTICATION REQUIRED
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. EMAIL VERIFICATION GATE
    if (!isEmailVerified && request.nextUrl.pathname !== '/verify-email') {
        return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // 4. FETCH USER ROLE FROM DATABASE (CRITICAL SECURITY CHECK)
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

    // 🚨 SECURITY: If user not found in database, logout immediately
    if (!userData || !userData.role) {
        console.error(`🔒 SECURITY BREACH PREVENTED: User ${session.user.id} has no database record`)
        const logoutResponse = NextResponse.redirect(new URL('/login', request.url))
        logoutResponse.cookies.delete('sb-access-token')
        logoutResponse.cookies.delete('sb-refresh-token')
        return logoutResponse
    }

    const role = userData.role

    // Allow access to pending-activation page
    if (request.nextUrl.pathname === '/pending-activation') {
        return response
    }

    // 5. DRIVER ACTIVATION CHECK
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

    // 6. ROLE-BASED PROTECTION
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
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
