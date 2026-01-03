"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Truck, CheckCircle2, Clock, MapPin, ArrowRight, AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, Timer } from "lucide-react"
import { useRouter } from "next/navigation"
import { format, isSameDay, subDays, startOfDay, endOfDay } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
// Recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

import { PushService } from '@/lib/push-service'
import { offlineManager } from '@/lib/offline-manager' // Auto-inits
import { DriverSetupGuide } from '@/components/driver-setup-guide'
import { useToast } from '@/components/toast-provider'
import { Power } from 'lucide-react'

export function DriverDashboardView({ userId }: { userId: string }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Default Today
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_progress: 0,
        delivered: 0,
        cancelled: 0
    })
    const [onTimeRate, setOnTimeRate] = useState(100)
    const [weeklyData, setWeeklyData] = useState<any[]>([])
    const [ordersList, setOrdersList] = useState<any[]>([])
    const [isOnline, setIsOnline] = useState(false)
    const [driverId, setDriverId] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        // Initialize Background Services
        PushService.init()
    }, [])

    useEffect(() => {
        fetchDriverStats()
    }, [userId, selectedDate])

    async function fetchDriverStats() {
        setIsLoading(true)
        try {
            // Get Driver ID linked to this User ID
            const { data: driverData } = await supabase
                .from('drivers')
                .select('id, name, is_online')
                .eq('user_id', userId)
                .single()


            if (!driverData) {
                setIsLoading(false)
                return
            }

            setDriverId(driverData.id)
            setIsOnline(driverData.is_online || false)

            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const isToday = isSameDay(selectedDate, new Date())

            // 1. FETCH MAIN ORDERS LIST (For Selected Day)
            let query = supabase
                .from('orders')
                .select('*')
                .eq('driver_id', driverData.id)
                .order('priority', { ascending: false })

            if (isToday) {
                // query = query.neq('status', 'cancelled') // Removed to include cancellations in stats
            } else {
                query = query.eq('delivery_date', dateStr)
            }

            const { data: orders } = await query

            if (orders) {
                let relevantOrders = orders
                if (isToday) {
                    relevantOrders = orders.filter(o => {
                        if (o.status === 'delivered') {
                            return o.delivered_at ? o.delivered_at.startsWith(dateStr) : true
                        }
                        return true
                    })
                }
                setOrdersList(relevantOrders)

                // Calculate Daily Stats
                const dailyTotal = relevantOrders.length
                const dailyDelivered = relevantOrders.filter(o => o.status === 'delivered').length

                setStats({
                    total: dailyTotal,
                    pending: relevantOrders.filter(o => o.status === 'assigned' || o.status === 'pending').length,
                    in_progress: relevantOrders.filter(o => o.status === 'in_progress').length,
                    delivered: dailyDelivered,
                    cancelled: relevantOrders.filter(o => o.status === 'cancelled').length
                })
            }

            // 2. FETCH WEEKLY HISTORY (For Chart & On-Time Rate)
            // Get last 7 days
            const startOfWeek = format(subDays(new Date(), 6), 'yyyy-MM-dd')

            const { data: historyOrders } = await supabase
                .from('orders')
                .select('status, delivery_date, delivered_at')
                .eq('driver_id', driverData.id)
                .gte('delivery_date', startOfWeek)
                .lte('delivery_date', format(new Date(), 'yyyy-MM-dd'))

            if (historyOrders) {
                // A. Compute Chart Data
                const chartMap: Record<string, { date: string, completed: number, failed: number }> = {}

                // Initialize last 7 days empty
                for (let i = 6; i >= 0; i--) {
                    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
                    const dayLabel = format(subDays(new Date(), i), 'EEE') // Mon, Tue...
                    chartMap[d] = { date: dayLabel, completed: 0, failed: 0 }
                }

                let onTimeCount = 0
                let totalDeliveredHistory = 0

                historyOrders.forEach(o => {
                    const d = o.delivery_date
                    if (chartMap[d]) {
                        if (o.status === 'delivered') {
                            chartMap[d].completed++
                            totalDeliveredHistory++
                            // Simple On-Time Check: Did they deliver on the scheduled date?
                            // (If delivered_at exists and starts with delivery_date)
                            if (o.delivered_at && o.delivered_at.startsWith(d)) {
                                onTimeCount++
                            } else if (!o.delivered_at) {
                                // Fallback if delivered_at missing but marked delivered
                                onTimeCount++
                            }
                        } else if (o.status === 'cancelled') {
                            chartMap[d].failed++
                        }
                    }
                })

                setWeeklyData(Object.values(chartMap))

                // B. Compute On-Time Rate
                // Rate = (OnTime / TotalDelivered) * 100
                // If no deliveries, 100% default
                if (totalDeliveredHistory > 0) {
                    setOnTimeRate(Math.round((onTimeCount / totalDeliveredHistory) * 100))
                } else {
                    setOnTimeRate(100)
                }
            }

        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    async function toggleOnlineStatus() {
        if (!driverId) return

        const newStatus = !isOnline
        setIsOnline(newStatus) // Optimistic

        try {
            await supabase.from('drivers').update({ is_online: newStatus }).eq('id', driverId)

            // Log Activity
            await supabase.from('driver_activity_logs').insert({
                driver_id: driverId,
                status: newStatus ? 'online' : 'offline',
                timestamp: new Date().toISOString()
            })

            toast({ title: newStatus ? "You are ONLINE 🟢" : "You are OFFLINE ⚫", type: "success" })
        } catch (error) {
            console.error(error)
            setIsOnline(!newStatus) // Revert
            toast({ title: "Failed to update status", type: "error" })
        }
    }

    if (isLoading) return <DriverDashboardSkeleton />

    const completionPercentage = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0
    const isToday = isSameDay(selectedDate, new Date())

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 p-4 space-y-6">
            {/* Header with Date Picker */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {isToday ? "My Route Today" : "History Report"} {isToday && "🚛"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {isToday ? "Let's get moving!" : format(selectedDate, 'EEEE, MMM d, yyyy')}
                    </p>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-slate-300 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800">
                            <CalendarIcon size={20} />
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
            </div>

            {/* STATUS TOGGLE & GUIDE */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Power size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Status: {isOnline ? 'Online' : 'Offline'}</p>
                        <p className="text-xs text-slate-500">{isOnline ? 'You are receiving orders' : 'You are currently hidden'}</p>
                    </div>
                </div>
                <Button
                    variant={isOnline ? "default" : "secondary"}
                    className={isOnline ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    onClick={toggleOnlineStatus}
                >
                    {isOnline ? 'Go Offline' : 'Go Online'}
                </Button>
            </div>

            {/* Quick Setup Guide */}
            <DriverSetupGuide
                isOnline={isOnline}
                hasTasks={stats.pending > 0}
                onToggleOnline={toggleOnlineStatus}
                onViewAssignments={() => router.push('/orders')}
            />

            {/* Main Progress Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <CheckCircle2 size={120} className="dark:text-white" />
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4">
                    {/* Circular Progress (CSS only) */}
                    <div className="relative h-32 w-32">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            {/* Background Circle */}
                            <path
                                className="text-slate-100 dark:text-slate-800"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            {/* Progress Circle */}
                            <path
                                className={`${completionPercentage === 100 ? 'text-green-500' : 'text-blue-600 dark:text-blue-500'} transition-all duration-1000 ease-out`}
                                strokeDasharray={`${completionPercentage}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.delivered}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">of {stats.total} Done</span>
                        </div>
                    </div>

                    <div className="w-full">
                        {completionPercentage === 100 && stats.total > 0 ? (
                            <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 py-2 px-4 rounded-full text-sm font-bold">
                                {isToday ? "🎉 All Done! Great Job!" : "✅ Completed fully"}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isToday ? `${stats.total - stats.delivered} stops remaining` : `${stats.delivered} stops completed`}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex flex-col items-center justify-center text-center">
                    <Timer className="text-blue-600 dark:text-blue-400 mb-2" size={24} />
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">{onTimeRate}%</span>
                    <span className="text-xs text-blue-600 dark:text-blue-300 font-medium uppercase">On-Time Rate</span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="text-red-600 dark:text-red-400 mb-2" size={24} />
                    <span className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.cancelled}</span>
                    <span className="text-xs text-red-600 dark:text-red-300 font-medium uppercase">Issues</span>
                </div>
            </div>

            {/* Weekly Performance Chart */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-slate-400" size={18} />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Weekly Performance</h3>
                </div>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                                {weeklyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.completed >= 10 ? '#22c55e' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Action Button (Show only Current Day) */}
            {
                isToday && (
                    <Button
                        size="lg"
                        className="w-full h-14 text-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/50 rounded-xl"
                        onClick={() => router.push('/orders')}
                    >
                        Start Delivering <ArrowRight className="ml-2" />
                    </Button>
                )
            }

            {/* Orders List */}
            <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">{isToday ? "Active Orders" : "Orders Log"}</h3>
                {ordersList.length === 0 ? (
                    <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                        {isToday ? "No active orders found." : "No delivery history for this day."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {ordersList.map(order => (
                            <div key={order.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' :
                                        order.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-slate-200">{order.customer_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{order.address?.split(',')[0]}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold inline-block ${order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                        order.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                        {order.status === 'delivered' ? 'Done' :
                                            order.status === 'cancelled' ? 'Failed' : 'Active'}
                                    </span>
                                    {/* Timestamp Display */}
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium flex items-center justify-end gap-1">
                                        {order.status === 'delivered' && order.delivered_at ? (
                                            <>
                                                <CheckCircle2 size={10} />
                                                {format(new Date(order.delivered_at), 'h:mm a')}
                                            </>
                                        ) : (order.time_window_start || order.time_window_end) ? (
                                            <>
                                                <Clock size={10} />
                                                {order.time_window_start?.slice(0, 5)} - {order.time_window_end?.slice(0, 5)}
                                            </>
                                        ) : null}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    )
}

function DriverDashboardSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
        </div>
    )
}
