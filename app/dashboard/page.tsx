'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle2, Clock, Package, Truck, AlertCircle, TrendingUp, MapPin, ArrowRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

import { useRouter } from 'next/navigation'
import { SetupGuide } from '@/components/setup-guide'
import Link from 'next/link'
import { DriverDashboardView } from '@/components/dashboard/driver-dashboard-view'
import { format, isSameDay } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagerActivityFeed } from '@/components/manager-activity-feed'
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/toast-provider"

export default function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([])
    const [filteredOrders, setFilteredOrders] = useState<any[]>([])

    // Filter State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Default Today

    const [userRole, setUserRole] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        delivered: 0,
        cancelled: 0
    })
    const [activeDriversCount, setActiveDriversCount] = useState(0)
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [userName, setUserName] = useState('')
    const router = useRouter()
    const [hasHubs, setHasHubs] = useState(false)
    const [driversMap, setDriversMap] = useState<Record<string, any>>({})
    const [showSetup, setShowSetup] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchDashboardData()

        // Realtime Subscription
        const channel = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                fetchDashboardData()

                // Manager Notifications Logic
                const newOrder = payload.new as any
                const oldOrder = payload.old as any // Note: 'old' is empty on INSERT
                const eventType = payload.eventType

                if (!newOrder) return

                // 1. Issue Reported (Critical)
                if (newOrder.status === 'cancelled' && (eventType === 'INSERT' || (oldOrder && oldOrder.status !== 'cancelled'))) {
                    toast({
                        title: "🚨 Issue Reported!",
                        description: `Order #${newOrder.order_number} marked as Failed/Cancelled.`,
                        type: "error"
                    })
                }

                // 2. Order Delivered (Success)
                if (newOrder.status === 'delivered' && (eventType === 'INSERT' || (oldOrder && oldOrder.status !== 'delivered'))) {
                    toast({
                        title: "✅ Order Delivered",
                        description: `${newOrder.customer_name} has received their package.`,
                        type: "success"
                    })
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchDashboardData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedDate]) // Re-fetch on date change

    async function fetchDashboardData() {
        try {
            // Get User & Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Get Profile & Role
            let { data: profile } = await supabase
                .from('users')
                .select('full_name, role, company_id')
                .eq('id', session.user.id)
                .single()

            // 🛠️ AUTO-REPAIR: If profile is missing OR incomplete (Trigger created empty row), fix it.
            if (!profile || !profile.role || !profile.company_id) {
                console.warn("⚠️ Profile incomplete! Attempting auto-repair...")
                try {
                    let targetCompanyId = profile?.company_id

                    // 1. If Company Missing, Create One
                    if (!targetCompanyId) {
                        const { data: newCompany } = await supabase
                            .from('companies')
                            .insert({ name: 'My Company' })
                            .select()
                            .single()

                        if (newCompany) targetCompanyId = newCompany.id
                    }

                    if (targetCompanyId) {
                        // 2. Update/Create User Profile
                        const { error: updateError } = await supabase
                            .from('users')
                            .upsert({
                                id: session.user.id,
                                email: session.user.email,
                                full_name: profile?.full_name || 'Manager',
                                role: 'manager', // Enforce Manager
                                company_id: targetCompanyId,
                                updated_at: new Date().toISOString()
                            })

                        if (!updateError) {
                            // Apply fixes to local state immediately
                            profile = {
                                full_name: profile?.full_name || 'Manager',
                                role: 'manager',
                                company_id: targetCompanyId
                            } as any

                            toast({
                                title: "Account Configured",
                                description: "Your profile has been automatically set up.",
                                type: "success"
                            })
                        }
                    }
                } catch (repairError) {
                    console.error("Auto-repair failed:", repairError)
                }
            }

            if (profile) {
                // Fix for missing name functionality
                const name = profile.full_name && profile.full_name.trim().length > 0
                    ? profile.full_name
                    : (profile.role === 'manager' ? 'Account Manager' : 'User');

                setUserName(name)
                setUserRole(profile.role)
                setUserId(session.user.id)

                if (profile.role === 'driver') {
                    setIsLoading(false)
                    return
                }

                if (profile.company_id) {
                    // PARALLEL FETCHING for performance
                    const [hubsResult, driversResult, ordersResult] = await Promise.all([
                        supabase.from('hubs').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id),
                        supabase.from('drivers').select('id, name, vehicle_type').eq('company_id', profile.company_id),
                        supabase.from('orders').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false })
                    ])

                    // 1. Check Hubs
                    const count = hubsResult.count || 0
                    setHasHubs(count > 0)

                    // 2. Process Drivers
                    const driversData = driversResult.data
                    const dMap: Record<string, any> = {}
                    if (driversData) {
                        driversData.forEach(d => { dMap[d.id] = d })
                        setDriversMap(dMap)
                    }

                    // 3. Process Orders
                    const ordersData = ordersResult.data
                    if (ordersData) {
                        const isToday = isSameDay(selectedDate, new Date())
                        let relevantOrders = ordersData

                        // Client-side filtering for specific dates if needed vs DB filtering
                        // Note: The original code fetched EVERYTHING for Today to handle cross-day logic
                        // but fetched specific date for history. 
                        // To keep parallel simple, we fetched all. If dataset grows, we should revert to specific query.
                        // However, for optimization now, simple clientside filter on the full set (assuming < 1000 orders) is faster than serial round trips.

                        // Recalculate based on selection
                        if (!isToday) {
                            const dateStr = format(selectedDate, 'yyyy-MM-dd')
                            relevantOrders = ordersData.filter(o => o.delivery_date === dateStr)
                        } else {
                            relevantOrders = ordersData.filter(o => {
                                const isUpdatedToday = o.updated_at ? isSameDay(new Date(o.updated_at), selectedDate) : false
                                if (o.status === 'delivered' || o.status === 'cancelled') {
                                    return isUpdatedToday
                                }
                                return true
                            })
                        }

                        setFilteredOrders(relevantOrders)
                        setOrders(relevantOrders)

                        // Calculate Stats
                        const newStats = {
                            total: relevantOrders.length,
                            pending: relevantOrders.filter(o => o.status === 'pending').length,
                            assigned: relevantOrders.filter(o => o.status === 'assigned').length,
                            inProgress: relevantOrders.filter(o => o.status === 'in_progress').length,
                            delivered: relevantOrders.filter(o => o.status === 'delivered').length,
                            cancelled: relevantOrders.filter(o => o.status === 'cancelled').length
                        }
                        setStats(newStats)
                        setRecentOrders(relevantOrders.slice(0, 5))

                        // Active Drivers Count
                        const activeDriverIds = new Set(relevantOrders.filter(o => o.driver_id && o.status !== 'pending').map(o => o.driver_id))
                        setActiveDriversCount(activeDriverIds.size)

                        // Show Setup if ANY step is missing (Hubs, Drivers, or Orders)
                        const totalDrivers = driversData ? driversData.length : 0
                        if (newStats.total === 0 || !hasHubs || totalDrivers === 0) {
                            setShowSetup(true)
                        } else {
                            setShowSetup(false)
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 18) return 'Good Afternoon'
        return 'Good Evening'
    }

    const isToday = isSameDay(selectedDate, new Date())

    if (isLoading) return <DashboardSkeleton />

    // 🚚 DRIVER VIEW
    if (userRole === 'driver' && userId) {
        return <DriverDashboardView userId={userId} />
    }

    // 👔 MANAGER VIEW
    return (
        <div className="p-4 space-y-6 pb-24 max-w-7xl mx-auto min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors">
            {/* 0. SETUP GUIDE (Conditional) */}
            {showSetup && (
                <div className="relative">
                    <button onClick={() => setShowSetup(false)} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white z-10"><X size={16} /></button>
                    <SetupGuide hasDrivers={activeDriversCount > 0} hasOrders={stats.total > 0} hasHubs={hasHubs} />
                </div>
            )}

            {/* 1. HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        {isToday ? getGreeting() : "Report View"}, {userName.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
                        {isToday ? "Live Operations Overview" : `Historical Report for ${format(selectedDate, 'MMM dd, yyyy')}`}
                        {isToday && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* DATE PICKER */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("justify-start text-left font-normal w-full md:w-[240px] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200", !selectedDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                disabled={(date) => date > new Date() || date < new Date("2024-01-01")}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <button onClick={() => router.push('/orders')} className="hidden sm:inline-flex md:flex-none items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-10">
                        <Package className="mr-2 h-4 w-4" /> Orders
                    </button>
                    <button onClick={() => router.push('/planner')} className="flex-1 md:flex-none inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors h-10 whitespace-nowrap">
                        <MapPin className="mr-2 h-4 w-4" /> Route Planner
                    </button>
                </div>
            </div>

            {/* 2. ALERT BANNER */}
            {stats.pending > 0 && isToday && (
                <div onClick={() => router.push('/planner')} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors group shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-inner">
                            <AlertCircle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 dark:text-amber-100">Action Required: {stats.pending} New Orders</h3>
                            <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">Assign these orders to drivers to begin delivery.</p>
                        </div>
                    </div>
                    <ArrowRight className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                </div>
            )}

            {/* 3. METRICS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Volume" value={stats.total} icon={Package} color="text-slate-600 dark:text-slate-400" bg="bg-slate-100 dark:bg-slate-800" />
                <StatsCard title="In Progress" value={stats.inProgress + stats.assigned} icon={Truck} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-900/30" />
                <StatsCard title="Completed" value={stats.delivered} icon={CheckCircle2} color="text-green-600 dark:text-green-400" bg="bg-green-100 dark:bg-green-900/30" />
                <StatsCard title="Issues/Cancel" value={stats.cancelled} icon={AlertCircle} color="text-red-600 dark:text-red-400" bg="bg-red-100 dark:bg-red-900/30" />
            </div>

            {/* 4. MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* A. FLEET PERFORMANCE (Left 2 Col) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <Truck className="text-blue-600 dark:text-blue-400" size={20} />
                            {isToday ? "Live Fleet Status" : "Driver Performance Log"}
                        </h2>
                        {isToday && (
                            <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                            </span>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {/* Group Orders by Driver */}
                        {(() => {
                            const driverStats = filteredOrders.reduce((acc: any, order: any) => {
                                if (!order.driver_id) return acc;
                                if (!acc[order.driver_id]) {
                                    // lookup driver details from map
                                    const dInfo = driversMap[order.driver_id] || { name: 'Unknown Driver', vehicle_type: 'Truck' }
                                    acc[order.driver_id] = { ...dInfo, total: 0, completed: 0, failed: 0, id: order.driver_id };
                                }
                                acc[order.driver_id].total++;
                                if (order.status === 'delivered') acc[order.driver_id].completed++;
                                if (order.status === 'cancelled') acc[order.driver_id].failed++;
                                return acc;
                            }, {});

                            const driversList = Object.values(driverStats);

                            if (driversList.length === 0) {
                                return (
                                    <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50">
                                        <Truck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No active drivers found for this date.</p>
                                    </div>
                                )
                            }

                            return driversList.map((driver: any, idx) => (
                                <DriverProgressCard key={driver.id || idx} driver={driver} index={idx} />
                            ))
                        })()}
                    </div>
                </div>

                {/* B. RECENT ACTIVITY (Right Col) */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Activity className="text-purple-600 dark:text-purple-400" size={20} />
                        Latest Updates
                    </h2>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                        <Tabs defaultValue="orders" className="w-full flex-1 flex flex-col">
                            <div className="px-4 pt-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="orders">Orders</TabsTrigger>
                                    <TabsTrigger value="activity">Driver Logs</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="orders" className="flex-1 overflow-y-auto max-h-[400px] p-0 m-0">
                                {filteredOrders.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center h-full">
                                        <Clock className="mb-2 opacity-50" />
                                        No activity recorded
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredOrders.slice(0, 10).map((order) => (
                                            <div key={order.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                                <div className={cn("mt-1.5 h-2 w-2 rounded-full flex-shrink-0 shadow-sm",
                                                    order.status === 'delivered' ? 'bg-green-500' :
                                                        order.status === 'assigned' ? 'bg-blue-500' :
                                                            order.status === 'in_progress' ? 'bg-purple-500' : 'bg-yellow-500'
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                        {order.customer_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                                                        <span>{order.status.replace('_', ' ')}</span>
                                                        <div className="flex items-center gap-2">
                                                            {/* Suspicious Delivery Warning */}
                                                            {(order as any).was_out_of_range && (
                                                                <span title="Driver was far from location!" className="flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
                                                                    <AlertCircle size={10} /> Suspicious
                                                                </span>
                                                            )}

                                                            <span className={cn("font-mono transition-opacity flex items-center gap-1",
                                                                !isSameDay(new Date(order.updated_at || order.created_at), new Date()) ? "text-red-500 font-bold" : "opacity-70 group-hover:opacity-100"
                                                            )}>
                                                                {order.status === 'delivered' && order.delivered_at ? (
                                                                    <>
                                                                        <CheckCircle2 size={10} className="text-green-500" />
                                                                        {format(new Date(order.delivered_at), 'HH:mm')}
                                                                    </>
                                                                ) : (
                                                                    !isSameDay(new Date(order.updated_at || order.created_at), new Date())
                                                                        ? format(new Date(order.updated_at || order.created_at), 'MMM dd, HH:mm')
                                                                        : new Date(order.updated_at || order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                )}
                                                            </span>
                                                        </div>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="activity" className="flex-1 overflow-y-auto max-h-[400px] p-4 m-0">
                                <ManagerActivityFeed />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DriverProgressCard({ driver, index }: { driver: any, index: number }) {
    const percentage = Math.round((driver.completed / driver.total) * 100) || 0

    return (
        <Link href={`/map?driverId=${driver.id}`}>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer group relative">
                {/* Hover Indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin size={10} /> Track Live
                </div>

                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    {driver.vehicle === 'Truck' ? '🚛' : driver.vehicle === 'Van' ? 'mw' : '👨‍✈️'}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{driver.name}</h3>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{driver.completed}/{driver.total} Stops</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${percentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                <div className="text-center min-w-[3rem]">
                    <span className={`text-sm font-bold ${percentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>
        </Link>
    )
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-card dark:bg-slate-900 text-card-foreground p-4 rounded-xl shadow-sm border border-border dark:border-slate-800 flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500 ${color}`}>
                <Icon size={64} />
            </div>
            <div className={`h-10 w-10 ${bg} ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
        </div>
    )
}
