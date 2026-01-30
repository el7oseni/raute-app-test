"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms']

export default function AuthCheck({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)

    // Check if current path is a public route
    const isPublicRoute = useMemo(() => {
        return PUBLIC_ROUTES.some(route =>
            pathname === route || pathname.startsWith(`${route}/`)
        )
    }, [pathname])

    // Skip auth entirely for landing page and marketing pages
    const isMarketingPage = pathname === '/' || pathname === '/privacy' || pathname === '/terms'

    useEffect(() => {
        // For marketing pages, skip all auth checks
        if (isMarketingPage) {
            setIsLoading(false)
            return
        }

        const checkAuth = async (retries = 3) => {
            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Auth Exception:", error)
                    setIsLoading(false)
                    return
                }

                // Retry if no session found (might be restoring from storage)
                if (!data.session && retries > 0) {
                    console.log(`Checking session... (${retries} retries left)`)
                    setTimeout(() => checkAuth(retries - 1), 500)
                    return // Don't stop loading yet
                }

                const session = data.session
                const isAuthenticated = !!session

                console.log('AuthCheck:', { path: pathname, authed: isAuthenticated })

                if (!isAuthenticated && !isPublicRoute) {
                    console.warn('⛔ Protected route access denied. Redirecting to login.')
                    router.push('/login')
                } else if (isAuthenticated) {
                    // Check Email Verification
                    if (session?.user && !session.user.email_confirmed_at && pathname !== '/verify-email') {
                        console.warn("⛔ Email not verified. Redirecting...")
                        router.push('/verify-email')
                        setIsLoading(false)
                        return
                    }

                    // Redirect authenticated users away from login/signup
                    if (['/login', '/signup'].includes(pathname)) {
                        console.log('✅ User already logged in. Redirecting to dashboard.')
                        router.push('/dashboard')
                    }
                }

                // Success path - stop loading
                setIsLoading(false)

            } catch (error) {
                console.error("Auth check critical failure:", error)
                // Only redirect to login if NOT on a public route AND NOT on landing page
                if (!isPublicRoute && pathname !== '/login' && pathname !== '/') {
                    router.push('/login')
                }
                setIsLoading(false)
            }
        }

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login')
            } else if (event === 'SIGNED_IN') {
                const redirectUrl = pathname === '/login' || pathname === '/signup' ? '/dashboard' : pathname
                if (pathname !== redirectUrl) {
                    router.push(redirectUrl)
                }
            }
        })

        checkAuth()

        return () => {
            subscription.unsubscribe()
        }
    }, [router, pathname, isPublicRoute, isMarketingPage])

    // Marketing pages render immediately without loading
    if (isMarketingPage) {
        return <>{children}</>
    }

    // Show loading spinner while checking auth
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return <>{children}</>
}
