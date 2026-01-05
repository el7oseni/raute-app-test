'use client'

import { Home, List, MapPin, User, Truck, Route } from 'lucide-react'


import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function MobileNav() {
    const pathname = usePathname()
    const router = useRouter()
    const [userRole, setUserRole] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('raute-role')
        }
        return null
    })
    const [loading, setLoading] = useState(true)

    const isActive = (path: string) => pathname === path

    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout

        const fetchRole = async (userId: string, retries = 1) => {
            try {
                // Fetch role with timeout safely
                const { data: userProfile, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', userId)
                    .maybeSingle()

                if (mounted) {
                    if (userProfile?.role) {
                        setUserRole(userProfile.role)
                        localStorage.setItem('raute-role', userProfile.role)
                        setLoading(false)
                    } else if (retries > 0) {
                        // Retry if profile not found yet (race condition on signup/signin)
                        console.warn(`Role not found, retrying... (${retries} left)`)
                        setTimeout(() => fetchRole(userId, retries - 1), 800)
                    } else {
                        // Final failure
                        setLoading(false)
                    }
                }
            } catch (error) {
                console.error('Error fetching role:', error)
                if (mounted) {
                    if (retries > 0) {
                        setTimeout(() => fetchRole(userId, retries - 1), 800)
                    } else {
                        setLoading(false)
                    }
                }
            }
        }

        // Safety timeout: if role fetch takes too long, give up (defaults to driver view)
        timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Role fetch timed out, defaulting to safe view.')
                setLoading(false)
            }
        }, 2000) // Reduced for faster loading

        // Auth Logic
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchRole(session.user.id)
            } else {
                if (mounted) setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await fetchRole(session.user.id)
            } else if (event === 'SIGNED_OUT') {
                setUserRole(null)
            }
        })

        return () => {
            mounted = false
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [])

    // Hide on auth pages
    if (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname.includes('/auth')) {
        return null
    }

    // Don't show anything while determining role to prevent flickering
    if (loading) return null

    const isDriver = userRole === 'driver'
    const isManager = userRole === 'manager' || userRole === 'admin'

    // Safety: If role is loaded but unknown, default to restricted view (Driver-like) 
    // to prevent leaking manager tabs

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-950 border-t border-border dark:border-slate-800 pb-safe safe-area-bottom shadow-lg transition-colors">
            <div className={`flex items-center justify-around h-16 max-w-lg mx-auto ${isDriver ? 'px-8' : ''}`}>

                {/* 1. Home / Dashboard (Everyone) */}
                <NavItem
                    href="/dashboard"
                    icon={Home}
                    label="Home"
                    active={isActive('/dashboard')}
                />

                {/* 2. Orders (Everyone) */}
                <NavItem
                    href="/orders"
                    icon={List}
                    label={isDriver ? 'My Orders' : 'Orders'}
                    active={isActive('/orders')}
                />

                {/* 3. Drivers (Managers Only) */}
                {isManager && (
                    <NavItem
                        href="/drivers"
                        icon={Truck}
                        label="Drivers"
                        active={isActive('/drivers')}
                    />
                )}

                {/* 3.5 Planner (Managers Only) */}
                {isManager && (
                    <NavItem
                        href="/planner"
                        icon={Route}
                        label="Planner"
                        active={isActive('/planner')}
                    />
                )}

                {/* 3.6 Dispatchers (Managers Only) */}
                {isManager && (
                    <NavItem
                        href="/dispatchers"
                        icon={User}
                        label="Team"
                        active={isActive('/dispatchers')}
                    />
                )}

                {/* 4. Map (Everyone) */}
                <NavItem
                    href="/map"
                    icon={MapPin}
                    label="Map"
                    active={isActive('/map')}
                />

                {/* 5. Profile (Everyone) */}
                <NavItem
                    href="/profile"
                    icon={User}
                    label="Profile"
                    active={isActive('/profile')}
                />
            </div>
        </div>
    )
}

function NavItem({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 select-none touch-manipulation",
                active
                    ? "text-blue-600 dark:text-blue-400 scale-105" // Explicit Active Color
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 active:scale-95" // Explicit Inactive Color
            )}
        >
            <Icon size={24} strokeWidth={active ? 2.5 : 2} className={active ? "fill-blue-100 dark:fill-blue-900/30" : "fill-none"} />
            <span className="text-[10px] font-medium tracking-tight">{label}</span>
        </Link>
    )
}
