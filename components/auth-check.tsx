"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function AuthCheck({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check for standard Supabase session
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Auth Exception:", error)
                    // If session check fails, force logout but don't crash
                    // valid session is better than crash
                    return
                }

                const session = data.session
                const isAuthenticated = !!session

                // List of public routes that don't require auth
                const publicRoutes = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation']

                const isPublicRoute = publicRoutes.some(route =>
                    pathname === route || pathname.startsWith(`${route}/`)
                )

                if (!isAuthenticated && !isPublicRoute) {
                    router.push('/login')
                } else if (isAuthenticated) {
                    // Check Email Verification
                    // Note: Supabase sometimes treats external providers as confirmed automatically.
                    // For email/password, we typically want to enforce this.
                    if (session?.user && !session.user.email_confirmed_at && pathname !== '/verify-email') {
                        // Safer check for user existence
                        console.warn("⛔ Email not verified. Redirecting...")
                        router.push('/verify-email')
                        return
                    }

                    if (['/login', '/signup', '/'].includes(pathname)) {
                        router.push('/dashboard')
                    }
                }
            } catch (error) {
                console.error("Auth check critical failure:", error)

                // List of public routes that don't require auth
                const publicRoutes = ['/login', '/signup', '/', '/verify-email', '/auth/callback', '/pending-activation', '/privacy', '/terms']

                const isPublicRoute = publicRoutes.some(route =>
                    pathname === route || pathname.startsWith(`${route}/`)
                )

                // Fallback to login only if NOT on a public route
                if (!isPublicRoute && pathname !== '/login') {
                    router.push('/login')
                }
            } finally {
                setIsLoading(false)
            }
        }

        // Subscribe to auth state changes (Standard)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login')
            } else if (event === 'SIGNED_IN') {
                const redirectUrl = pathname === '/login' || pathname === '/signup' ? '/dashboard' : pathname
                // Only navigate if not already on target path
                if (pathname !== redirectUrl) {
                    router.push(redirectUrl)
                }
            }
        })

        checkAuth()

        return () => {
            subscription.unsubscribe()
        }
    }, [router, pathname])

    // Show nothing while checking auth to prevent flash of protected content
    // Or show a loading spinner
    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return <>{children}</>
}
