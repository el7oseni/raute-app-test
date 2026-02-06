"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms']

export default function AuthCheck({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    // Skip auth entirely for landing page and marketing pages
    const isMarketingPage = pathname === '/' || pathname === '/privacy' || pathname === '/terms'
    // Determine initial loading state based on page type
    const [isLoading, setIsLoading] = useState(() => !isMarketingPage)
    const [lastRedirect, setLastRedirect] = useState<number>(0)

    // Check if current path is a public route
    const isPublicRoute = useMemo(() => {
        return PUBLIC_ROUTES.some(route =>
            pathname === route || pathname.startsWith(`${route}/`)
        )
    }, [pathname])

    useEffect(() => {
        // For marketing pages, skip all auth checks
        if (isMarketingPage) {
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
                    console.log(`⏳ Checking session... (${retries} retries left)`)
                    setTimeout(() => checkAuth(retries - 1), 1000) // Increased from 700ms to 1000ms
                    return // Don't stop loading yet
                }

                const session = data.session
                const isAuthenticated = !!session

                console.log('AuthCheck:', { path: pathname, authed: isAuthenticated })

                // Helper function to safely redirect with cooldown protection
                const safeRedirect = (path: string, reason: string) => {
                    const now = Date.now()
                    const timeSinceLastRedirect = now - lastRedirect
                    
                    if (timeSinceLastRedirect < 2000) {
                        console.warn(`⏸️ Redirect blocked (cooldown: ${2000 - timeSinceLastRedirect}ms remaining)`)
                        return false
                    }
                    
                    console.log(`🔄 ${reason}`)
                    setLastRedirect(now)
                    router.push(path)
                    return true
                }

                if (!isAuthenticated && !isPublicRoute) {
                    safeRedirect('/login', '⛔ Protected route access denied. Redirecting to login.')
                } else if (isAuthenticated) {
                    // Check Email Verification
                    if (session?.user && !session.user.email_confirmed_at && pathname !== '/verify-email') {
                        if (safeRedirect('/verify-email', '⛔ Email not verified. Redirecting...')) {
                            setIsLoading(false)
                            return
                        }
                    }

                    // Let login/signup pages handle their own navigation after auth
                    // Removing automatic redirect to prevent timing issues with session persistence
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login')
            } else if (event === 'SIGNED_IN') {
                // Only redirect if we're NOT already on login/signup
                // (those pages handle their own navigation)
                if (pathname !== '/login' && pathname !== '/signup') {
                    router.push('/dashboard')
                }
            }
        })

        checkAuth()

        return () => {
            subscription.unsubscribe()
        }
    }, [router, pathname, isPublicRoute, isMarketingPage, lastRedirect])

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
