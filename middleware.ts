import { createServerClient } from '@supabase/ssr'
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
    // IMPORTANT: Use the modern getAll/setAll API (not deprecated get/set/remove).
    // The old API had a critical bug: each set() call created a new NextResponse,
    // which discarded Set-Cookie headers from previous set() calls.
    // With chunked cookies (session split into .0, .1, .2 etc.), only the LAST
    // chunk would survive — corrupting the session cookie in the browser.
    // After the browser restarts and the access token expires, the middleware
    // tries to refresh it and set new cookies, but the response lost all but
    // the last chunk. The browser then had a broken session cookie, causing
    // the client-side getSession() to return null and redirect to login.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // First, update the request cookies so subsequent middleware
                    // reads see the updated values
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )

                    // Recreate the response with the updated request headers
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })

                    // Set ALL cookies on the response at once (no data loss)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // NOTE: Do NOT exchange OAuth codes in middleware.
    // The PKCE flow stores code_verifier in the browser (cookie/localStorage),
    // which is NOT accessible in Edge Runtime middleware. Attempting to exchange
    // the code here will fail AND invalidate the code, preventing the client-side
    // auth/callback/page.tsx from exchanging it successfully.
    // Let the client-side handle the full PKCE code exchange.

    // Check for auth cookies BEFORE getSession() modifies them.
    // getSession() may call _removeSession() if refresh fails, which triggers
    // setAll() with deletion cookies (maxAge: 0) — poisoning the response.
    const authCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    const hasAuthCookies = authCookies.length > 0

    const { data: { session } } = await supabase.auth.getSession()

    // 1. PUBLIC ROUTES (Allow access)
    const publicRoutes = ['/login', '/signup', '/verify-email', '/auth/callback', '/pending-activation', '/']
    const isPublicRoute = publicRoutes.some(route => {
        return request.nextUrl.pathname === route || request.nextUrl.pathname === `${route}/`
    })

    if (isPublicRoute) {
        // For public routes, if we had auth cookies but refresh failed,
        // return a clean response WITHOUT the deletion Set-Cookie headers.
        // This preserves the cookies so the client-side can try refreshing.
        if (hasAuthCookies && !session) {
            return NextResponse.next({ request: { headers: request.headers } })
        }
        return response
    }

    // 2. AUTHENTICATION REQUIRED
    if (!session) {
        // CRITICAL FIX: If auth cookies exist but getSession() returned null,
        // the access token is expired and the server-side refresh failed.
        //
        // When refresh fails, Supabase calls _removeSession() → setAll() which
        // writes Set-Cookie headers with maxAge:0 to DELETE the browser cookies.
        // If we return that poisoned `response`, the browser loses its cookies
        // and the client-side can never recover the session.
        //
        // Instead, return a CLEAN response (no Set-Cookie headers) so the
        // browser keeps its cookies. The client-side Supabase client
        // (with autoRefreshToken: true) will handle the refresh.
        if (hasAuthCookies) {
            return NextResponse.next({ request: { headers: request.headers } })
        }
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
