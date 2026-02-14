"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms', '/debug-auth']

export default function AuthCheck({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const isMarketingPage = pathname === '/' || pathname === '/privacy' || pathname === '/terms'
    // Don't show skeleton on public routes (login, signup, etc) — render immediately
    const isPublicPage = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname === `${route}/` || pathname.startsWith(`${route}/`)
    )
    const [isLoading, setIsLoading] = useState(() => !isMarketingPage && !isPublicPage)

    // Use ref for redirect cooldown to avoid re-renders
    const lastRedirectRef = useRef<number>(0)
    // Track if component is mounted to avoid state updates after unmount
    const isMountedRef = useRef(true)
    // Track if auth check is already running to prevent duplicates
    const authCheckRunningRef = useRef(false)

    const isPublicRoute = useMemo(() => {
        return PUBLIC_ROUTES.some(route =>
            pathname === route || pathname.startsWith(`${route}/`)
        )
    }, [pathname])

    useEffect(() => {
        isMountedRef.current = true

        // For marketing pages, skip all auth checks
        if (isMarketingPage) {
            return
        }

        // Prevent duplicate auth checks
        if (authCheckRunningRef.current) {
            return
        }

        // Maximum timeout to prevent frozen screens (10 seconds for Capacitor)
        // IMPORTANT: Do NOT call signOut here — it destroys sessions mid-establishment
        const maxTimeout = setTimeout(() => {
            console.warn('⏱️ Auth check timeout (10s) - forcing render')
            if (isMountedRef.current) {
                setIsLoading(false)
            }
            authCheckRunningRef.current = false
        }, 10000)

        const checkAuth = async (retries = 10) => {
            authCheckRunningRef.current = true

            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("❌ Auth error:", error.message)

                    // Handle specific error types
                    if (error.message.includes('string did not match') ||
                        error.message.includes('pattern') ||
                        error.message.includes('Invalid')) {
                        console.warn('⚠️ Session validation error - clearing corrupted data')

                        // Clear corrupted session data
                        try {
                            await supabase.auth.signOut({ scope: 'local' })
                            const { capacitorStorage } = await import('@/lib/capacitor-storage')
                            await capacitorStorage.clearAllAuthData()
                        } catch (cleanupErr) {
                            console.error('Cleanup failed:', cleanupErr)
                        }

                        // Redirect to login after cleanup
                        if (!isPublicRoute) {
                            clearTimeout(maxTimeout)
                            if (isMountedRef.current) {
                                setIsLoading(false)
                                router.push('/login?error=session_invalid')
                            }
                            authCheckRunningRef.current = false
                            return
                        }
                    }

                    clearTimeout(maxTimeout)
                    if (isMountedRef.current) setIsLoading(false)
                    authCheckRunningRef.current = false
                    return
                }

                // Retry if no session found (session is being restored from storage)
                // On native platforms, use more retries with shorter delays
                if (!data.session && retries > 0) {
                    const delay = retries > 5 ? 400 : 600 // Shorter delay for first few retries
                    console.log(`⏳ Waiting for session... (${retries} retries left)`)
                    setTimeout(() => {
                        if (isMountedRef.current) checkAuth(retries - 1)
                    }, delay)
                    return
                }

                const isAuthenticated = !!data.session
                console.log('✅ AuthCheck result:', {
                    path: pathname,
                    authenticated: isAuthenticated,
                    hasSession: !!data.session,
                    userId: data.session?.user?.id?.substring(0, 8)
                })

                if (!isAuthenticated && !isPublicRoute) {
                    // No session on protected route — redirect to login
                    const now = Date.now()
                    if (now - lastRedirectRef.current > 3000) {
                        console.log('⛔ No session on protected route, redirecting to login')
                        lastRedirectRef.current = now
                        router.push('/login')
                    }
                } else if (isAuthenticated) {
                    // Validate session data
                    const session = data.session!
                    if (!session.access_token || !session.user) {
                        console.error('❌ Invalid session data, clearing and redirecting')
                        await supabase.auth.signOut({ scope: 'local' })
                        if (!isPublicRoute) {
                            router.push('/login?error=invalid_session')
                        }
                        clearTimeout(maxTimeout)
                        if (isMountedRef.current) setIsLoading(false)
                        authCheckRunningRef.current = false
                        return
                    }

                    // Check email verification
                    const user = data.session!.user
                    if (!user.email_confirmed_at && pathname !== '/verify-email') {
                        const now = Date.now()
                        if (now - lastRedirectRef.current > 3000) {
                            lastRedirectRef.current = now
                            router.push('/verify-email')
                        }
                    }
                }

                // Done checking — render children
                clearTimeout(maxTimeout)
                if (isMountedRef.current) setIsLoading(false)
                authCheckRunningRef.current = false

            } catch (error: any) {
                console.error("❌ Auth check failed:", error)

                // Handle session validation errors
                if (error?.message?.includes('string did not match') ||
                    error?.message?.includes('pattern')) {
                    console.warn('⚠️ Clearing corrupted session and redirecting')
                    try {
                        await supabase.auth.signOut({ scope: 'local' })
                    } catch {}

                    if (!isPublicRoute) {
                        router.push('/login?error=session_corrupted')
                    }
                }

                clearTimeout(maxTimeout)
                if (isMountedRef.current) setIsLoading(false)
                authCheckRunningRef.current = false
            }
        }

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Auth event:', event, 'hasSession:', !!session)

            // IMPORTANT: Ignore INITIAL_SESSION — we handle that in checkAuth
            if (event === 'INITIAL_SESSION') return

            if (event === 'SIGNED_OUT') {
                if (isMountedRef.current && !isPublicRoute) {
                    router.push('/login')
                }
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Session established or refreshed — stop loading
                if (isMountedRef.current) {
                    setIsLoading(false)
                }
            }
        })

        checkAuth()

        return () => {
            isMountedRef.current = false
            authCheckRunningRef.current = false
            clearTimeout(maxTimeout)
            subscription.unsubscribe()
        }
    // CRITICAL: Only re-run when pathname changes. Do NOT include state variables
    // that change during the effect (like lastRedirect) — that causes infinite loops.
    }, [router, pathname, isPublicRoute, isMarketingPage])

    // Public and marketing pages render immediately (no skeleton)
    if (isMarketingPage || isPublicPage) {
        return <>{children}</>
    }

    // Show skeleton while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3 ring-1 ring-slate-200 dark:ring-slate-800">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </div>
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
