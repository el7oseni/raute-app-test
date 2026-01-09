"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Filter, Package, MapPin, Calendar, User as UserIcon, Truck, Navigation2, CheckCircle2, Power, Sparkles, Camera, Loader2, ArrowRight, Edit, Settings, List, Clock, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase, type Order } from "@/lib/supabase"
import { parseOrderAI, type ParsedOrder } from "@/lib/gemini"
import { reverseGeocode } from "@/lib/geocoding"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import LocationPicker from "@/components/location-picker"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CustomFieldsManager } from "@/components/custom-fields-manager"
import { ThemeToggle } from "@/components/theme-toggle"
import { DriverTracker } from "@/components/driver-tracker"
import { useToast } from "@/components/toast-provider"
import { XCircle } from "lucide-react"
import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"
import { DriverSetupGuide } from "@/components/driver-setup-guide"
import { StyledPhoneInput } from "@/components/ui/styled-phone-input"
import { isValidPhoneNumber } from "react-phone-number-input"
import { DriverActivityHistory } from "@/components/driver-activity-history"
import { format } from "date-fns"

const statusColors = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
}

const DriverRouteMap = dynamic(() => import('@/components/driver-route-map'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/20"><Loader2 className="animate-spin text-muted-foreground" /></div>
})

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [companyId, setCompanyId] = useState<string | null>(null) // Cache CompanyId
    const [isOnline, setIsOnline] = useState(false)
    const [driverId, setDriverId] = useState<string | null>(null)

    // For Add Order
    const [pickedLocation, setPickedLocation] = useState<{
        lat: number
        lng: number
    } | null>(null)

    // Form Hooks
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [zipCode, setZipCode] = useState('')
    const [phoneValue, setPhoneValue] = useState<string | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    // AI State
    const [isParsing, setIsParsing] = useState(false)
    const [aiOrders, setAiOrders] = useState<ParsedOrder[]>([])
    const [activeTab, setActiveTab] = useState("ai")
    const formRef = React.useRef<HTMLFormElement>(null)
    const { toast } = useToast()
    const [aiInputText, setAiInputText] = useState("")

    // Bulk Delete State
    const [selectedOrders, setSelectedOrders] = useState<string[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        filterOrders()
    }, [orders, searchQuery, statusFilter])

    // 🔔 REAL-TIME NOTIFICATIONS FOR DRIVER
    useEffect(() => {
        if (!driverId) return

        console.log("🎧 Listening for assignments for driver:", driverId)

        const channel = supabase
            .channel(`driver-notifications-${driverId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'orders',
                    filter: `driver_id=eq.${driverId}`
                },
                (payload) => {
                    const newRecord = payload.new as Order
                    const eventType = payload.eventType

                    // Trigger Refresh
                    fetchData()

                    // 1. New Assignment (INSERT or UPDATE from null to me)
                    if (eventType === 'INSERT' || (eventType === 'UPDATE' && newRecord.status === 'assigned')) {
                        // Only notify if it's 'assigned' (ignore if I just marked it delivered myself)
                        // Simple check: If I am the one viewing this page, and status is assigned, it means Manager assigned it.
                        // (Unless I assigned it myself? Drivers usually don't assign themselves).
                        if (newRecord.status === 'assigned') {
                            toast({
                                title: "🎉 New Order Assigned!",
                                description: `Customer: ${newRecord.customer_name}`,
                                type: "success"
                            })
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [driverId])

    async function fetchData() {
        setIsLoading(true)
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id, role, full_name')
                .eq('id', user.id)
                .maybeSingle()

            if (!userProfile) return

            // Store user details
            setUserRole(userProfile.role)
            setUserName(userProfile.full_name || 'Driver')
            setCompanyId(userProfile.company_id) // Save to State

            // Fetch Data based on Role
            if (userProfile.role === 'driver') {
                const { data: driverData } = await supabase
                    .from('drivers')
                    .select('id, is_online')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!driverData) {
                    setOrders([])
                    return
                }

                setDriverId(driverData.id)
                // IMPORTANT: Set initial state from DB to prevent flip-flopping
                setIsOnline(driverData.is_online === true)

                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('driver_id', driverData.id)
                    // .neq('status', 'cancelled') // Removed to show history
                    .order('route_index', { ascending: true }) // PRIMARY sort: Route Sequence
                    .order('priority', { ascending: false })   // Fallback
                    .order('created_at', { ascending: false }) // Fallback

                if (error) throw error
                setOrders(data || [])
            } else {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('company_id', userProfile.company_id)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setOrders(data || [])
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    function filterOrders() {
        let filtered = orders
        if (statusFilter !== "all") {
            filtered = filtered.filter(order => order.status === statusFilter)
        }
        if (searchQuery) {
            filtered = filtered.filter(order =>
                order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.address.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }
        setFilteredOrders(filtered)
    }

    async function toggleOnlineStatus() {
        if (!driverId) {
            console.error("❌ No Driver ID found! Cannot toggle status.")
            toast({ title: "Error", description: "Driver profile not found.", type: "error" })
            return
        }

        const currentStatus = isOnline
        const newStatus = !currentStatus

        console.log(`🔄 Toggling status: ${currentStatus} -> ${newStatus} for Driver ID: ${driverId}`)

        // 1. Optimistic Update
        setIsOnline(newStatus)

        try {
            // 2. Perform DB Update
            const { data, error } = await supabase
                .from('drivers')
                .update({ is_online: newStatus })
                .eq('id', driverId)
                .select()

            if (error) throw error

            // 3. Log Activity
            await supabase.from('driver_activity_logs').insert({
                driver_id: driverId,
                status: newStatus ? 'online' : 'offline',
                timestamp: new Date().toISOString()
            })

            console.log("✅ Status updated successfully in DB:", data)
            toast({ title: newStatus ? "You are ONLINE 🟢" : "You are OFFLINE ⚫", type: "success" })

        } catch (error: any) {
            console.error("💥 Catch Block Error:", error)
            setIsOnline(currentStatus) // Revert UI
            toast({
                title: "Failed to update status",
                description: error.message || "Database permission denied",
                type: "error"
            })
        }
    }

    async function geocodeAddress(address: string, city?: string, state?: string): Promise<{ lat: number; lng: number } | null> {
        const fullAddress = [address, city, state].filter(Boolean).join(', ')
        if (!fullAddress.trim()) return null

        try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            if (!apiKey) {
                console.warn("⚠️ Google Maps API Key missing. Falling back...");
                throw new Error("Missing API Key");
            }

            console.log("🌍 Geocoding with Google Maps:", fullAddress);

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
            )
            const data = await response.json()

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location
                return { lat: location.lat, lng: location.lng } // Google returns numbers directly
            } else {
                console.warn("Geocoding failed:", data.status, data.error_message);
                return null;
            }
        } catch (error) {
            console.error('Geocoding error (Google), trying Nominatim backup:', error)
            // Fallback to Nominatim (OpenStreetMap) if Google fails or key is missing
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
                    { headers: { 'User-Agent': 'Raute Delivery App' } }
                )
                const data = await response.json()
                if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
            } catch (err) {
                console.error("Nominatim Fallback Failed:", err)
            }
            return null
        }
    }

    async function handleAIParse(input: string | File | File[]) {
        setIsParsing(true)
        try {
            const results = await parseOrderAI(input)
            if (results && results.length > 0) {
                setAiOrders(results)

                // --- BULK AUTO-SAVE WORKFLOW ---
                // Get User Context once

                // Use cached ID or fetch fallback
                let targetCompanyId = companyId

                if (!targetCompanyId) {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) throw new Error("No user found")
                    const { data: userProfile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
                    if (!userProfile) throw new Error("No profile found - Please refresh the page")
                    targetCompanyId = userProfile.company_id
                }

                if (!targetCompanyId) throw new Error("Company ID Not Found")

                // Map all results to database objects with geocoding
                // We process sequentially to be nice to the free Geocoding API (Rate Limits)
                const newOrders: any[] = []
                for (let i = 0; i < results.length; i++) {
                    const result = results[i]
                    // Generate unique ID if missing: ORD-Timestamp-Index
                    const generatedId = `ORD-${Date.now().toString().slice(-6)}-${i + 1}`

                    // Try to geocode the address
                    const coords = await geocodeAddress(
                        result.address || '',
                        result.city,
                        result.state
                    )

                    // Add small delay between requests (1s)
                    if (i < results.length - 1) await new Promise(r => setTimeout(r, 1000))

                    newOrders.push({
                        company_id: targetCompanyId,
                        order_number: result.order_number || generatedId,
                        customer_name: result.customer_name || 'Unknown Customer',
                        address: result.address || 'Address Missing',
                        city: result.city || '',
                        state: result.state || '',
                        zip_code: result.zip_code || '',
                        phone: result.phone || '',
                        delivery_date: result.delivery_date || new Date().toISOString().split('T')[0],
                        notes: result.notes || '',
                        status: 'pending',
                        priority: 0,
                        latitude: coords?.lat || null,
                        longitude: coords?.lng || null
                    })
                }

                // Batch Insert
                const { error } = await supabase.from('orders').insert(newOrders)
                if (error) throw error

                // Success Feedback
                setIsAddOrderOpen(false)
                setPickedLocation(null)
                setAiInputText("")
                setSelectedFiles([])
                fetchData()
                toast({
                    title: `🚀 Imported ${newOrders.length} orders!`,
                    description: "Orders have been created and assigned.",
                    type: "success"
                })
            } else {
                toast({
                    title: "No Orders Found",
                    description: "We analyzed the images but couldn't find any clear order details. Please ensure the images contain legible text with addresses.",
                    type: "error"
                })
            }
        } catch (error: any) {
            console.error("AI Parse Error:", error)
            toast({
                title: "Import Failed",
                description: error.message || "Could not extract orders. Please check the input format.",
                type: "error"
            })
        } finally {
            setIsParsing(false)
        }
    }

    const populateForm = (data: ParsedOrder) => {
        if (!formRef.current) return
        const setVal = (name: string, val: string) => {
            const el = formRef.current?.elements.namedItem(name) as HTMLInputElement
            if (el) el.value = val
        }
        if (data.order_number) setVal('order_number', data.order_number)
        if (data.customer_name) setVal('customer_name', data.customer_name)
        if (data.address) setVal('address', data.address)
        if (data.city) setVal('city', data.city)
        if (data.state) setVal('state', data.state)
        if (data.zip_code) setVal('zip_code', data.zip_code)
        if (data.phone) setVal('phone', data.phone)
        if (data.delivery_date) setVal('delivery_date', data.delivery_date)
        if (data.notes) setVal('notes', data.notes)
    }

    function toggleOrderSelection(orderId: string) {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        )
    }

    function toggleSelectAll() {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([])
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id))
        }
    }

    async function handleBulkDelete() {
        if (selectedOrders.length === 0) return

        const confirmed = confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)? This cannot be undone.`)
        if (!confirmed) return

        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .in('id', selectedOrders)

            if (error) throw error

            setSelectedOrders([])
            fetchData()
            toast({ title: `Deleted ${selectedOrders.length} orders`, type: "success" })
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    async function handleAddOrder(formData: FormData) {
        if (isSubmitting) return
        setIsSubmitting(true)
        console.log("handleAddOrder called")
        // Prevent default submission behavior handled by React is not applicable here as it's a server action / function call, 
        // but since we are using <form action={}> this is fine.

        const customerName = formData.get('customer_name') as string
        const address = formData.get('address') as string

        if (!customerName || !address) {
            toast({ title: "Name and Address are required", type: "error" })
            setIsSubmitting(false) // Release lock
            return
        }

        // Phone Validation
        const phone = phoneValue
        console.log("Phone value:", phone)
        if (phone && !isValidPhoneNumber(phone)) {
            toast({ title: "Invalid Phone Number", description: "Please enter a valid international number", type: "error" })
            setIsSubmitting(false) // Release lock
            return
        }

        try {
            console.log("Fetching user...")
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.error("No auth user found")
                toast({ title: "Session Error", description: "Please refresh the page.", type: "error" })
                return
            }

            console.log("Fetching profile...")
            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!userProfile) {
                console.error("No profile found for user:", user.id)
                toast({ title: "Profile Error", description: "Could not find your company profile.", type: "error" })
                return
            }

            console.log("Creating new order object...")
            const city = formData.get('city') as string; const state = formData.get('state') as string; const zipCode = formData.get('zip_code') as string
            const newOrder = {
                company_id: userProfile.company_id,
                order_number: formData.get('order_number') as string,
                customer_name: customerName,
                address,
                city,
                state,
                zip_code: zipCode,
                phone: phone,
                delivery_date: formData.get('delivery_date') as string,
                notes: formData.get('notes') as string,
                status: 'pending' as const,
                priority: 0,
                latitude: pickedLocation?.lat || null,
                longitude: pickedLocation?.lng || null,
            }

            const { error } = await supabase.from('orders').insert(newOrder)
            if (error) throw error
            setIsAddOrderOpen(false); setPickedLocation(null); setPhoneValue(undefined); fetchData()
            toast({ title: "Order created successfully", type: "success" })
        } catch (error) {
            console.error(error)
            toast({ title: "Failed to create order", type: "error" })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4 pb-20 max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </header>
                <div className="space-y-3">
                    <div className="relative">
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4 flex gap-4">
                            <Skeleton className="h-4 w-4 mt-6 rounded bg-muted" />
                            <div className="flex-1 space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }


    // DRIVER UI
    if (userRole === 'driver') {
        const activeCount = orders.filter(o => o.status === 'assigned' || o.status === 'in_progress').length
        const completedCount = orders.filter(o => o.status === 'delivered').length

        return (
            <div className="p-4 space-y-6 pb-24 max-w-lg mx-auto bg-background min-h-screen">
                {driverId && <DriverTracker driverId={driverId} isOnline={isOnline} />}

                {/* Driver Header with Toggle */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Good Morning,</p>
                        <h1 className="text-2xl font-bold text-foreground">{userName.split(' ')[0]} 👋</h1>
                    </div>

                    {/* Status Toggle Button */}
                    <div className="flex items-center gap-2">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full border-dashed border-2">
                                    <Calendar size={16} className="text-slate-400" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Activity History</SheetTitle>
                                    <SheetDescription>Your recent online/offline activity logs.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-4">
                                    <DriverActivityHistory driverId={driverId} />
                                </div>
                            </SheetContent>
                        </Sheet>

                        <button
                            onClick={toggleOnlineStatus}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border transition-all text-sm font-bold",
                                isOnline
                                    ? "bg-green-500/10 text-green-600 border-green-200 dark:border-green-900"
                                    : "bg-muted text-muted-foreground border-border"
                            )}
                        >
                            <div className={cn("w-2 h-2 rounded-full transition-colors", isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400")} />
                            {isOnline ? "ONLINE" : "OFFLINE"}
                        </button>
                    </div>
                </div>

                {/* Offline Warning Banner */}
                {!isOnline && (
                    <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl text-center text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
                        You are currently offline. You won't receive new tasks.
                    </div>
                )}

                <DriverSetupGuide
                    isOnline={isOnline}
                    hasTasks={activeCount > 0}
                    onToggleOnline={toggleOnlineStatus}
                    onViewAssignments={() => {
                        const el = document.getElementById('orders-list')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                />

                {/* Quick Stats (dimmed if offline) */}
                <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !isOnline && "opacity-60")}>
                    <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg shadow-primary/20">
                        <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wider mb-1">Active Tasks</p>
                        <p className="text-3xl font-bold mb-1">{activeCount}</p>
                        <p className="text-xs text-primary-foreground/70">Ready to deliver</p>
                    </div>
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Completed</p>
                        <p className="text-3xl font-bold text-foreground mb-1">{completedCount}</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Today
                        </p>
                    </div>
                </div>

                {/* View Toggle (List vs Map) */}
                <div className="flex bg-muted p-1 rounded-xl shadow-inner mb-4">
                    <button onClick={() => setActiveTab('list')} className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2", activeTab === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                        <List size={14} /> List
                    </button>
                    <button onClick={() => setActiveTab('map')} className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2", activeTab === 'map' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                        <MapPin size={14} /> Route Map
                    </button>
                </div>

                {/* Status Filter (remains) */}
                <div className="flex bg-muted p-1 rounded-xl shadow-inner mb-4 overflow-x-auto">
                    {["all", "assigned", "delivered", "cancelled"].map((status) => (
                        <button key={status} onClick={() => setStatusFilter(status)} className={cn("flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all min-w-[70px]", statusFilter === status ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {status === 'all' ? 'All' : status}
                        </button>
                    ))}
                </div>

                {activeTab === 'list' ? (
                    // LIST VIEW
                    <div className="space-y-4" id="orders-list">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">Today's Route</h2>
                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                                <p className="text-muted-foreground font-medium">No orders found</p>
                            </div>
                        ) : (
                            (() => {
                                // 1. Prepare Sorted List
                                const sortedOrders = [...filteredOrders].sort((a, b) => (a.route_index || 999) - (b.route_index || 999))

                                // 2. Identify NEXT Active Order
                                const nextOrder = sortedOrders.find(o => o.status === 'assigned' || o.status === 'pending' || o.status === 'in_progress')

                                return sortedOrders.map((order) => {
                                    const isNext = nextOrder?.id === order.id

                                    // Safe Status Color Lookup
                                    const statusColorClass = statusColors[order.status as keyof typeof statusColors] || "bg-gray-100 text-gray-500 border-gray-200"

                                    return (
                                        <Link key={order.id} href={`/my-editor?id=${order.id}`} className="block group">
                                            <div className={cn(
                                                "bg-card p-5 rounded-2xl shadow-sm border transition-all relative overflow-hidden",
                                                isNext ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:shadow-md hover:border-primary/50",
                                                (order.status === 'delivered' || order.status === 'cancelled') && "opacity-75 bg-slate-50 dark:bg-slate-900/50" // Dim completed/cancelled
                                            )}>
                                                {/* Status Stripe */}
                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5",
                                                    order.status === 'delivered' ? 'bg-green-500' :
                                                        order.status === 'cancelled' ? 'bg-red-500' :
                                                            order.status === 'in_progress' ? 'bg-purple-500' : 'bg-blue-500'
                                                )} />

                                                <div className="flex justify-between items-start mb-3 pl-3">
                                                    <div className="flex items-center gap-2">
                                                        {/* Route Sequence Badge */}
                                                        {order.route_index && (
                                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-sm">
                                                                {order.route_index}
                                                            </span>
                                                        )}
                                                        <span className="font-mono text-xs text-muted-foreground">#{order.order_number}</span>
                                                    </div>

                                                    {/* Time Window Badge */}
                                                    {order.time_window_start ? (
                                                        <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-900/50 text-[10px] font-bold uppercase">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                            {order.time_window_start.slice(0, 5)} - {order.time_window_end?.slice(0, 5)}
                                                        </div>
                                                    ) : (
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                            statusColorClass
                                                                .replace('bg-', 'bg-opacity-10 bg-')
                                                                .replace('border-', 'border-opacity-20 border-')
                                                        )}>
                                                            {order.status.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="pl-3 mb-4">
                                                    <h3 className="font-bold text-foreground text-lg mb-1 leading-tight">{order.customer_name}</h3>
                                                    <div className="flex items-start gap-2 text-muted-foreground">
                                                        <MapPin size={16} className="mt-0.5 text-muted-foreground/70 shrink-0" />
                                                        <p className="text-sm leading-relaxed">{order.address}, {order.city}</p>
                                                    </div>
                                                </div>

                                                <div className="pl-3 pt-3 border-t border-border flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        {isNext ? (
                                                            <span className="text-primary font-bold flex items-center gap-1 animate-pulse">
                                                                🚀 NEXT STOP
                                                            </span>
                                                        ) : order.status === 'delivered' ? (
                                                            <span className="text-green-600 font-bold flex items-center gap-1">
                                                                <CheckCircle2 size={12} /> COMPLETED
                                                            </span>
                                                        ) : order.status === 'cancelled' ? (
                                                            <span className="text-red-600 font-bold flex items-center gap-1">
                                                                <XCircle size={12} /> CANCELLED
                                                            </span>
                                                        ) : (
                                                            <span>Tap for details</span>
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                                                        isNext ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-primary group-hover:text-primary-foreground"
                                                    )}>
                                                        <ArrowRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })
                            })()
                        )}
                    </div>
                ) : (
                    // MAP VIEW
                    <div className="h-[600px] rounded-2xl overflow-hidden border border-border shadow-md">
                        <DriverRouteMap orders={filteredOrders.filter(o => o.latitude && o.longitude && o.status !== 'delivered')} />
                    </div>
                )}
            </div>
        )
    }

    // MANAGER UI
    return (
        <div className="p-4 space-y-4 pb-20 max-w-7xl mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">All Orders</h1>
                    <p className="text-muted-foreground text-sm">Manage company deliveries</p>
                    {selectedOrders.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">{selectedOrders.length} selected</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {selectedOrders.length > 0 && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="gap-2"
                            onClick={handleBulkDelete}
                        >
                            🗑️ Delete ({selectedOrders.length})
                        </Button>
                    )}
                    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <SheetTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2">
                                <Settings size={14} /> Settings
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-lg">
                            <SheetHeader>
                                <SheetTitle>Settings</SheetTitle>
                                <SheetDescription>Manage your orders settings and preferences</SheetDescription>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                                {/* Custom Fields Section */}
                                <div className="pb-6">
                                    <CustomFieldsManager entityType="order" />
                                </div>

                                {/* Future sections can be added here */}
                                {/* Example:
                                <div className="border-b pb-6">
                                    <h3 className="text-lg font-bold">Company Info</h3>
                                    ...
                                </div>
                                */}
                            </div>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
                        <SheetTrigger asChild><Button size="sm" className="gap-2 shadow-lg shadow-blue-200"><Plus size={16} /> Add Order</Button></SheetTrigger>

                        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (isLocationPickerOpen) e.preventDefault() }}>
                            <SheetHeader className="mb-4"><SheetTitle>Add New Order</SheetTitle><SheetDescription>Choose how you want to add orders</SheetDescription></SheetHeader>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="ai" className="gap-2"><Sparkles size={14} /> AI Smart Import</TabsTrigger>
                                    <TabsTrigger value="manual" className="gap-2"><Edit size={14} /> Manual Entry</TabsTrigger>
                                </TabsList>

                                <TabsContent value="ai" className="mt-0 pb-32">
                                    <div className="p-1 rounded-2xl bg-gradient-to-b from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 border border-indigo-100 dark:border-slate-800 shadow-sm relative overflow-visible group min-h-[300px] flex flex-col justify-center">
                                        <div className="absolute -top-3 left-4 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-slate-700 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider shadow-sm z-10 flex items-center gap-1">
                                            <Sparkles size={10} className="text-indigo-500 fill-indigo-500" /> AI AUTO-FILL
                                        </div>

                                        <div className="p-3 space-y-4">
                                            <div className="text-center space-y-2 mb-2">
                                                <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Magically Extract Orders</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 px-4">Paste unstructured text (chats, emails) or upload screenshots. We'll extract details automatically.</p>
                                            </div>

                                            <div className="mx-4 mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg text-[11px] text-yellow-800 dark:text-yellow-200 flex items-start gap-2 text-left">
                                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                <span><strong>Tip:</strong> If pasting a spreadsheet/table, please include the <u>Header Row</u> so we can identify columns correctly!</span>
                                            </div>

                                            <div className="relative">
                                                <textarea
                                                    placeholder="Paste order text here..."
                                                    value={aiInputText}
                                                    onChange={(e) => setAiInputText(e.target.value)}
                                                    className="w-full min-h-[120px] text-sm p-3 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-400 transition-all resize-y text-slate-700 dark:text-slate-200 shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-10"
                                                />
                                                {aiInputText && (
                                                    <button
                                                        onClick={() => setAiInputText("")}
                                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                        title="Clear text"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                                {isParsing ? (
                                                    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 animate-in fade-in">
                                                        <Loader2 size={12} className="animate-spin" /> Analyzing...
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={!aiInputText}
                                                        onClick={() => handleAIParse(aiInputText)}
                                                        className="absolute bottom-2 right-2 p-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md transition-transform active:scale-95 flex items-center gap-2 text-xs font-bold px-3 disabled:opacity-50 disabled:pointer-events-none"
                                                    >
                                                        Analyze Text <ArrowRight size={12} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="h-px bg-indigo-50 dark:bg-slate-800 flex-1" />
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">OR</span>
                                                <div className="h-px bg-indigo-50 dark:bg-slate-800 flex-1" />
                                            </div>

                                            <label className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-slate-900/50 border border-dashed border-indigo-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all cursor-pointer group/upload shadow-sm">
                                                <input
                                                    type="file"
                                                    accept="image/*,.csv,.xlsx,.xls"
                                                    multiple
                                                    className="hidden"
                                                    value="" // Always reset so onChange fires even for same file
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files.length > 0) {
                                                            const newFiles = Array.from(e.target.files)
                                                            setSelectedFiles(prev => [...prev, ...newFiles])
                                                        }
                                                    }}
                                                />
                                                <div className="p-2 bg-indigo-100 dark:bg-slate-800 rounded-full text-indigo-600 dark:text-indigo-400 group-hover/upload:scale-110 transition-transform">
                                                    <Camera size={18} />
                                                </div>
                                                <span>{selectedFiles.length > 0 ? "Add More Files" : "Select Images or Excel"}</span>
                                            </label>

                                            {/* File List & Analyze Button */}
                                            {selectedFiles.length > 0 && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-2 border border-slate-100 dark:border-slate-800">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Files ({selectedFiles.length})</p>
                                                            <button onClick={() => setSelectedFiles([])} className="text-[10px] text-red-500 hover:text-red-600 font-medium">Clear All</button>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {selectedFiles.map((file, idx) => (
                                                                <li key={`${file.name}-${idx}`} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                                        <span className="truncate">{file.name}</span>
                                                                        <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                                        title="Remove file"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <Button
                                                        onClick={() => handleAIParse(selectedFiles)}
                                                        disabled={isParsing}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    >
                                                        {isParsing ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Analyzing {selectedFiles.length} Images...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="mr-2 h-4 w-4" />
                                                                Analyze {selectedFiles.length} Images
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="manual" className="pb-32">
                                    <form
                                        id="add-order-form"
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            console.log("Form submitted!")
                                            const formData = new FormData(e.currentTarget)
                                            handleAddOrder(formData)
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex justify-between">
                                                Order Number
                                                <span className="text-[10px] text-slate-400 font-normal self-end">(Auto-generated if empty)</span>
                                            </label>
                                            <Input name="order_number" placeholder="ORD-001" />
                                        </div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Customer Name</label><Input name="customer_name" placeholder="John Doe" required /></div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <LocationPicker onLocationSelect={async (lat, lng) => {
                                                setPickedLocation({ lat, lng })
                                                const res = await reverseGeocode(lat, lng)
                                                if (res) {
                                                    setAddress(res.address)
                                                    setCity(res.city)
                                                    setState(res.state)
                                                    setZipCode(res.zip)
                                                }
                                            }} />
                                            {pickedLocation && (<p className="text-xs text-blue-600 mt-2 flex items-center gap-1"><MapPin size={12} /> Selected: {pickedLocation.lat.toFixed(4)}, {pickedLocation.lng.toFixed(4)}</p>)}
                                        </div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Address</label><Input name="address" placeholder="123 Main St" required value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">City</label><Input name="city" placeholder="New York" value={city} onChange={(e) => setCity(e.target.value)} /></div><div className="space-y-2"><label className="text-sm font-medium">State</label><Input name="state" placeholder="NY" value={state} onChange={(e) => setState(e.target.value)} /></div></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><label className="text-sm font-medium">ZIP Code</label><Input name="zip_code" placeholder="10001" value={zipCode} onChange={(e) => setZipCode(e.target.value)} /></div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Phone</label>
                                                <StyledPhoneInput
                                                    name="phone"
                                                    value={phoneValue}
                                                    onChange={setPhoneValue}
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Delivery Date</label><Input name="delivery_date" type="date" /></div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Notes</label><textarea name="notes" className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Notes..." /></div>
                                        <Button
                                            type="button"
                                            className="w-full"
                                            disabled={isSubmitting}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                if (isSubmitting) return
                                                console.log("Button clicked, forcing submit...")
                                                const form = document.getElementById('add-order-form') as HTMLFormElement
                                                if (form) form.requestSubmit()
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                "Create Order"
                                            )}
                                        </Button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <div className="space-y-3 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders..."
                        className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {["all", "pending", "assigned", "in_progress", "delivered", "cancelled"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                                statusFilter === status
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {status === "all" ? "All" : status.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {filteredOrders.length > 0 && (
                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="checkbox"
                            checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-2 focus:ring-primary cursor-pointer accent-primary"
                        />
                        <span className="text-sm text-muted-foreground font-medium">Select All</span>
                    </div>
                )}

                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                        <p className="text-muted-foreground font-medium">No orders found</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="flex items-start gap-3 group">
                            <input
                                type="checkbox"
                                checked={selectedOrders.includes(order.id)}
                                onChange={(e) => {
                                    e.stopPropagation()
                                    toggleOrderSelection(order.id)
                                }}
                                className="mt-6 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0 accent-primary"
                            />
                            <Link href={`/my-editor?id=${order.id}`} className="flex-1">
                                <div className="bg-card p-5 rounded-xl shadow-sm border border-border space-y-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden">
                                    {/* Status Stripe */}
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                                        order.status === 'delivered' ? 'bg-green-500' :
                                            order.status === 'in_progress' ? 'bg-purple-500' :
                                                order.status === 'cancelled' ? 'bg-red-500' :
                                                    order.status === 'assigned' ? 'bg-blue-500' : 'bg-yellow-500'
                                    )} />

                                    <div className="flex justify-between items-start pl-2">
                                        <div>
                                            <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">#{order.order_number}</p>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 font-medium">
                                                <UserIcon size={14} className="text-primary/70" />
                                                {order.customer_name}
                                            </div>
                                        </div>
                                        <span className={cn("px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                                            statusColors[order.status].replace('bg-', 'bg-opacity-10 bg-').replace('border-', 'border-opacity-20 border-')
                                        )}>
                                            {order.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-sm text-muted-foreground pl-2 border-t border-border/50 pt-3">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground/70" />
                                            <span className="leading-snug">{order.address}{order.city ? `, ${order.city}` : ""}</span>
                                        </div>
                                        {order.delivery_date && (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="flex-shrink-0 text-muted-foreground/70" />
                                                <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {/* Timestamp for Manager Tracking */}
                                        {(order.delivered_at || order.time_window_start) && (
                                            <div className="flex items-center gap-2 font-medium">
                                                {order.status === 'delivered' && order.delivered_at ? (
                                                    <>
                                                        <CheckCircle2 size={14} className="flex-shrink-0 text-green-600 dark:text-green-500" />
                                                        <span className="text-green-700 dark:text-green-400 text-xs font-bold">
                                                            Delivered at {format(new Date(order.delivered_at), 'h:mm a')}
                                                        </span>
                                                    </>
                                                ) : (order.time_window_start) ? (
                                                    <>
                                                        <Clock size={14} className="flex-shrink-0 text-orange-600 dark:text-orange-400" />
                                                        <span className="text-orange-700 dark:text-orange-300 text-xs font-bold">
                                                            Window: {order.time_window_start?.slice(0, 5)} - {order.time_window_end?.slice(0, 5)}
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))
                )}
            </div>

        </div>
    )
}
