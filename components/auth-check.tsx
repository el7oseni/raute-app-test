"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { Capacitor } from "@capacitor/core"
import { restoreSessionFromBackup } from "@/components/auth-listener"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms']

// Global flag: set to true when user explicitly clicks "Logout".
// This tells the SIGNED_OUT handler to skip recovery attempts.
// Exported so profile/login pages can set it before calling signOut().
let _intentionalLogout = false
export function markIntentionalLogout() {
    _intentionalLogout = true
}

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
    // Track if we already resolved (session found or redirected)
    const resolvedRef = useRef(false)
    // Track if we've confirmed a valid session (prevents skeleton flash between protected routes)
    const sessionConfirmedRef = useRef(false)

    const isPublicRoute = useMemo(() => {
        return PUBLIC_ROUTES.some(route =>
            pathname === route || pathname.startsWith(`${route}/`)
        )
    }, [pathname])

    // Helper: stop loading and mark resolved
    const finishLoading = () => {
        if (isMountedRef.current) setIsLoading(false)
        authCheckRunningRef.current = false
        resolvedRef.current = true
        sessionConfirmedRef.current = true
    }

    // Helper: redirect to login (with cooldown)
    const redirectToLogin = (reason?: string) => {
        if (!isMountedRef.current || isPublicRoute || resolvedRef.current) return
        const now = Date.now()
        if (now - lastRedirectRef.current > 3000) {
            console.log(`⛔ Redirecting to login: ${reason || 'no session'}`)
            lastRedirectRef.current = now
            resolvedRef.current = true
            sessionConfirmedRef.current = false
            if (isMountedRef.current) setIsLoading(false)
            authCheckRunningRef.current = false
            router.push('/login')
        }
    }

    useEffect(() => {
        isMountedRef.current = true
        resolvedRef.current = false

        // For marketing pages, skip all auth checks
        if (isMarketingPage) {
            return
        }

        // If session was already confirmed (navigating between protected routes),
        // skip the loading state and full auth re-check. We still set up the
        // onAuthStateChange listener below to catch SIGNED_OUT events.
        const skipFullCheck = !isPublicRoute && sessionConfirmedRef.current

        if (skipFullCheck) {
            resolvedRef.current = true
        }

        // When entering a protected route without a previously confirmed session,
        // show loading until we verify. This prevents rendering children before
        // auth is confirmed (e.g. navigating from /login to /dashboard after login).
        if (!isPublicRoute && !sessionConfirmedRef.current) {
            setIsLoading(true)
        }

        // Prevent duplicate auth checks
        if (authCheckRunningRef.current && !skipFullCheck) {
            return
        }

        const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform()

        // TIMEOUT: Force resolve after timeout
        // Web: 8s (3 retries × 500ms + buffer), Native: 8s (4 retries × 500ms + buffer)
        const maxTimeoutMs = 8000
        const maxTimeout = setTimeout(() => {
            if (resolvedRef.current) return
            console.warn(`⏱️ Auth check timeout (${maxTimeoutMs / 1000}s) - forcing resolve`)
            // On timeout, redirect to login if on protected route (don't just show empty page)
            if (!isPublicRoute) {
                redirectToLogin('timeout')
            } else {
                finishLoading()
            }
        }, maxTimeoutMs)

        const checkAuth = async (retries: number) => {
            if (resolvedRef.current) return
            authCheckRunningRef.current = true

            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("❌ Auth error:", error.message)

                    // Handle corrupted session
                    if (error.message.includes('string did not match') ||
                        error.message.includes('pattern') ||
                        error.message.includes('Invalid')) {
                        console.warn('⚠️ Session validation error - clearing corrupted data')
                        try {
                            await supabase.auth.signOut({ scope: 'local' })
                            if (isNative) {
                                const { capacitorStorage } = await import('@/lib/capacitor-storage')
                                await capacitorStorage.clearAllAuthData()
                            }
                        } catch (cleanupErr) {
                            console.error('Cleanup failed:', cleanupErr)
                        }
                        clearTimeout(maxTimeout)
                        redirectToLogin('session_invalid')
                        return
                    }

                    clearTimeout(maxTimeout)
                    finishLoading()
                    return
                }

                // SESSION FOUND
                if (data.session) {
                    // Validate session data
                    if (!data.session.access_token || !data.session.user) {
                        console.error('❌ Invalid session data, clearing')
                        await supabase.auth.signOut({ scope: 'local' })
                        clearTimeout(maxTimeout)
                        redirectToLogin('invalid_session')
                        return
                    }

                    console.log('✅ AuthCheck: session found', {
                        path: pathname,
                        userId: data.session.user.id.substring(0, 8)
                    })
                    // Check email verification
                    if (!data.session.user.email_confirmed_at && pathname !== '/verify-email') {
                        const now = Date.now()
                        if (now - lastRedirectRef.current > 3000) {
                            lastRedirectRef.current = now
                            router.push('/verify-email')
                        }
                    }

                    clearTimeout(maxTimeout)
                    finishLoading()
                    return
                }

                // NO SESSION — on native, try direct storage recovery early (after 2 retries)
                // because getSession() only reads from Supabase's in-memory state.
                // If _initialize() failed to read from Capacitor Preferences (bridge not ready),
                // all subsequent getSession() calls return null — retrying is pointless.
                // Instead, read directly from storage and use refreshSession() to restore.
                if (isNative && retries <= 2 && !isPublicRoute) {
                    console.log('🔄 Attempting direct storage recovery...')

                    // Try Supabase's internal storage key first
                    try {
                        const { capacitorStorage } = await import('@/lib/capacitor-storage')
                        const stored = await capacitorStorage.getItem('sb-raute-auth')
                        if (stored) {
                            const parsed = JSON.parse(stored)
                            if (parsed?.refresh_token) {
                                const { data: refreshData } = await supabase.auth.refreshSession({
                                    refresh_token: parsed.refresh_token
                                })
                                if (refreshData.session) {
                                    console.log('✅ Session recovered via direct storage + refreshSession!')
                                    clearTimeout(maxTimeout)
                                    finishLoading()
                                    return
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('⚠️ Storage recovery failed:', err)
                    }

                    // Try redundant session backup
                    try {
                        const restored = await restoreSessionFromBackup()
                        if (restored) {
                            console.log('✅ Session recovered from backup!')
                            clearTimeout(maxTimeout)
                            finishLoading()
                            return
                        }
                    } catch (err) {
                        console.warn('⚠️ Backup restore failed:', err)
                    }
                }

                // NO SESSION — retry (session may not be persisted to cookies yet)
                // On web: cookies from signInWithPassword may take a moment to be readable
                // On native: continue retrying in case Capacitor bridge becomes ready
                if (retries > 0) {
                    console.log(`⏳ No session yet, retrying... (${retries} left)`)
                    setTimeout(() => {
                        if (isMountedRef.current && !resolvedRef.current) checkAuth(retries - 1)
                    }, 500)
                    return
                }

                // NO SESSION on web — no retries needed (cookies are instant)
                // Give up and redirect to login
                console.log('✅ AuthCheck: no session found', { path: pathname })
                clearTimeout(maxTimeout)
                if (!isPublicRoute) {
                    redirectToLogin('no_session')
                } else {
                    finishLoading()
                }

            } catch (error: any) {
                console.error("❌ Auth check failed:", error)
                if (error?.message?.includes('string did not match') || error?.message?.includes('pattern')) {
                    try {
                        await supabase.auth.signOut({ scope: 'local' })
                        if (isNative) {
                            const { capacitorStorage } = await import('@/lib/capacitor-storage')
                            await capacitorStorage.clearAllAuthData()
                        }
                    } catch {}
                }
                clearTimeout(maxTimeout)
                if (!isPublicRoute) {
                    redirectToLogin('error')
                } else {
                    finishLoading()
                }
            }
        }

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔔 Auth event:', event, 'hasSession:', !!session)

            if (event === 'SIGNED_OUT') {
                sessionConfirmedRef.current = false

                // If this was an intentional logout (user clicked Logout button),
                // skip all recovery attempts and redirect immediately.
                if (_intentionalLogout) {
                    _intentionalLogout = false
                    console.log('⛔ Intentional logout — redirecting to login')
                    if (isMountedRef.current && !isPublicRoute) {
                        router.push('/login')
                    }
                    return
                }

                // False SIGNED_OUT: Supabase fires this when auto token refresh fails
                // (e.g. AbortError on resume, race conditions with detectSessionInUrl).
                // Wait a moment then check if user is still valid server-side.
                if (isMountedRef.current && !isPublicRoute) {
                    // Small delay — let any in-flight token refresh settle
                    await new Promise(resolve => setTimeout(resolve, 500))
                    if (!isMountedRef.current) return

                    try {
                        // First check local session
                        const { data } = await supabase.auth.getSession()
                        if (data.session) {
                            console.log('⚠️ SIGNED_OUT event but session still exists — ignoring redirect')
                            sessionConfirmedRef.current = true
                            return
                        }

                        // No local session — verify server-side (maybe token was just refreshed)
                        const { data: userData } = await supabase.auth.getUser()
                        if (userData.user) {
                            console.log('⚠️ SIGNED_OUT event but user still valid server-side — refreshing session')
                            // Try to refresh the session
                            const { data: refreshData } = await supabase.auth.refreshSession()
                            if (refreshData.session) {
                                console.log('✅ Session refreshed after false SIGNED_OUT')
                                sessionConfirmedRef.current = true
                                return
                            }
                        }

                        console.log('⛔ SIGNED_OUT confirmed — no session, redirecting')
                        router.push('/login')
                    } catch {
                        // If all checks fail, redirect to be safe
                        router.push('/login')
                    }
                }
            } else if (event === 'INITIAL_SESSION') {
                if (session && isMountedRef.current) {
                    console.log('✅ INITIAL_SESSION with session - stopping loading')
                    clearTimeout(maxTimeout)
                    finishLoading()
                } else if (!session && isNative && !isPublicRoute) {
                    // On native, INITIAL_SESSION fires before Preferences is ready
                    // Let checkAuth handle the retries
                    console.log('⏳ INITIAL_SESSION null on native - waiting for retries...')
                }
                // On web, if INITIAL_SESSION has no session, checkAuth will handle redirect
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session && isMountedRef.current) {
                    clearTimeout(maxTimeout)
                    finishLoading()
                }
            }
        })

        // Start auth check (skip if session already confirmed from previous route)
        if (!skipFullCheck) {
            if (isNative) {
                // Native: small delay for Preferences init, then retry up to 4 times
                setTimeout(() => {
                    if (isMountedRef.current && !resolvedRef.current) checkAuth(4)
                }, 300)
            } else {
                // Web: retry up to 3 times with 500ms delay between attempts.
                // After login, cookies may not be immediately readable by getSession().
                checkAuth(3)
            }
        }

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
