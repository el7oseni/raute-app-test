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

    // OAuth callback: exchange code for session server-side so cookies are set properly.
    // Without this, the client-side exchangeCodeForSession sets the session in memory
    // but cookies aren't written, causing auth-check to fail on the next page load.
    if (request.nextUrl.pathname === '/auth/callback') {
        const code = request.nextUrl.searchParams.get('code')
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error) {
                // Cookies are set by the supabase client above — redirect to dashboard
                const dashboardUrl = new URL('/dashboard', request.url)
                return NextResponse.redirect(dashboardUrl)
            }
            // If exchange fails, let the client-side page.tsx handle it
            console.error('Middleware code exchange failed:', error.message)
        }
    }

    const { data: { session } } = await supabase.auth.getSession()

    // 1. PUBLIC ROUTES (Allow access)
    const publicRoutes = ['/login', '/signup', '/verify-email', '/auth/callback', '/pending-activation', '/']
    const isPublicRoute = publicRoutes.some(route => {
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
    const isEmailVerified = session?.user?.email_confirmed_at
    if (!isEmailVerified && request.nextUrl.pathname !== '/verify-email') {
        return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    // 4. ALL OTHER CHECKS (role, onboarding, driver activation) are handled client-side
    // by the dashboard page and AuthCheck component.
    // This prevents middleware timeouts (504 MIDDLEWARE_INVOCATION_TIMEOUT)
    // caused by slow database queries in the edge runtime.

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
         * - api routes (protected separately)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|privacy|terms|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
