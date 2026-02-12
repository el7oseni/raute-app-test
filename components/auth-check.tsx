"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { isSessionCorrupted } from "@/lib/session-cleanup"
import { Skeleton } from "@/components/ui/skeleton"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms', '/debug-auth']

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

        // Maximum timeout to prevent frozen screens (8 seconds for Capacitor)
        // IMPORTANT: Do NOT call signOut here — it destroys sessions mid-establishment
        const maxTimeout = setTimeout(() => {
            console.warn('⏱️ Auth check timeout (8s) - forcing render')
            setIsLoading(false)
        }, 8000)

        const checkAuth = async (retries = 5) => {
            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Auth Exception:", error)
                    clearTimeout(maxTimeout)
                    setIsLoading(false)
                    return
                }

                // Validate session integrity before retrying
                if (data.session && isSessionCorrupted(data.session)) {
                    console.error('❌ Corrupted session detected - clearing')
                    await supabase.auth.signOut({ scope: 'local' })
                    clearTimeout(maxTimeout)
                    setIsLoading(false)
                    if (!isPublicRoute) {
                        router.push('/login')
                    }
                    return
                }

                // Retry if no session found (might be restoring from Capacitor Preferences)
                if (!data.session && retries > 0) {
                    console.log(`⏳ Checking session... (${retries} retries left)`)
                    setTimeout(() => checkAuth(retries - 1), 800)
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
                            clearTimeout(maxTimeout)
                            setIsLoading(false)
                            return
                        }
                    }

                    // Let login/signup pages handle their own navigation after auth
                    // Removing automatic redirect to prevent timing issues with session persistence
                }

                // Success path - stop loading and clear timeout
                clearTimeout(maxTimeout)
                setIsLoading(false)

            } catch (error) {
                console.error("Auth check critical failure:", error)
                clearTimeout(maxTimeout)
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
                // Only redirect TO dashboard if we're currently on login/signup
                // Don't redirect if already on a protected page (prevents reload loop)
                if (pathname === '/login' || pathname === '/signup') {
                    router.push('/dashboard')
                }
            }
        })

        checkAuth()

        return () => {
            clearTimeout(maxTimeout)
            subscription.unsubscribe()
        }
    }, [router, pathname, isPublicRoute, isMarketingPage, lastRedirect])

    // Marketing pages render immediately without loading
    if (isMarketingPage) {
        return <>{children}</>
    }

    // Show dashboard skeleton while checking auth (no spinner circles)
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                {/* Stats skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3 ring-1 ring-slate-200 dark:ring-slate-800">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>
                {/* Content skeleton */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3 ring-1 ring-slate-200 dark:ring-slate-800">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return <>{children}</>
}
