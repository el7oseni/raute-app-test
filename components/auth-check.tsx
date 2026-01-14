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
                const { data: { session } } = await supabase.auth.getSession()

                // CHECK FOR CUSTOM SESSION (Bypass)
                const customUserId = typeof window !== 'undefined' ? localStorage.getItem('raute_user_id') : null
                const isAuthenticated = !!session || !!customUserId

                // List of public routes that don't require auth
                const publicRoutes = ['/login', '/signup', '/']

                if (!isAuthenticated && !publicRoutes.includes(pathname)) {
                    // If no session and trying to access protected route, redirect to login
                    router.push('/login')
                } else if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
                    // If session exists and trying to access auth pages, redirect to dashboard
                    router.push('/dashboard')
                }
            } catch (error) {
                console.error("Auth check failed:", error)
            } finally {
                setIsLoading(false)
            }
        }

        // Subscribe to auth state changes (Standard)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                localStorage.removeItem('raute_user_id') // Clear custom session too
                router.push('/login')
            } else if (event === 'SIGNED_IN') {
                const redirectUrl = pathname === '/login' || pathname === '/signup' ? '/dashboard' : pathname
                router.push(redirectUrl)
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
