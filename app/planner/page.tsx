'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase, type Order, type Driver } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Truck, Sparkles, AlertCircle, Lock, Unlock, Clock, ExternalLink } from 'lucide-react'
import { useToast } from "@/components/toast-provider"
import { useTheme } from 'next-themes'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDraggable,
    useDroppable
} from '@dnd-kit/core'

/**
 * DYNAMIC MAP IMPORTS
 */
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false })
// const useMap = dynamic(() => import('react-leaflet').then(m => m.useMap), { ssr: false }) // Disabled for simpler implementation



// Helper to fix Leaflet icons in Next.js
// We'll run this in the component via useEffect to avoid top-level issues
const fixLeafletIcons = () => {
    if (typeof window !== 'undefined') {
        const L = require('leaflet')
        // Check if already fixed to avoid errors
        if ((L.Icon.Default.prototype as any)._getIconUrl) {
            delete (L.Icon.Default.prototype as any)._getIconUrl
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            })
        }
    }
}

/**
 * DRAGGABLE ORDER CARD COMPONENT
 */
function DraggableOrderCard({ order, isOverlay = false, onViewDetails }: { order: Order, isOverlay?: boolean, onViewDetails?: (o: Order) => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: order.id,
        data: { order }
    })

    const style = isDragging ? { opacity: 0.5 } : undefined

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onDoubleClick={() => onViewDetails?.(order)} // Quick View on Double Click
            className={`cursor-grab active:cursor-grabbing hover:border-primary dark:hover:border-primary transition-colors group ${isOverlay ? 'shadow-2xl scale-105 rotate-2 border-primary' : ''} ${order.locked_to_driver ? 'border-l-4 border-l-red-500' : ''} ${order.status === 'cancelled' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 opacity-80' : 'bg-card dark:bg-slate-900 border-border dark:border-slate-800'}`}
        >
            <CardContent className="p-3">
                <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                        #{order.order_number}
                        {order.locked_to_driver && <Lock size={10} className="text-red-500" />}
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200 font-bold' : order.status === 'assigned' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
                            {order.status === 'cancelled' ? 'FAILED' : order.status}
                        </span>
                        {/* Open in New Tab Button */}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails?.(order); // Open Side Panel
                            }}
                            className="text-muted-foreground hover:text-primary p-0.5 hover:bg-muted rounded"
                        >
                            <ExternalLink size={12} />
                        </button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{order.customer_name}</p>
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={10} />
                        <span className="truncate">{order.address}</span>
                    </div>
                    {(!order.latitude || !order.longitude) && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded w-fit border border-red-100 animate-pulse">
                            <AlertCircle size={10} />
                            <span>No GPS</span>
                        </div>
                    )}
                    {(order.time_window_start || order.time_window_end) && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                            <Clock size={10} />
                            <span>
                                {order.time_window_start?.slice(0, 5) || 'Any'} - {order.time_window_end?.slice(0, 5) || 'Any'}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * DROPPABLE DRIVER CONTAINER COMPONENT
 */
function DroppableDriverContainer({ driver, orders, children }: { driver: Driver, orders: Order[], children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `driver-${driver.id}`,
        data: { driver }
    })

    return (
        <div
            ref={setNodeRef}
            className={`bg-card dark:bg-slate-900 border rounded-md p-2 transition-colors ${isOver ? 'border-primary bg-primary/5 dark:bg-primary/20 ring-2 ring-primary/20' : 'border-border dark:border-slate-800'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${driver.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className="font-medium text-sm">{driver.name}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {orders.length} orders
                </span>
            </div>

            {/* Expanded List of Orders for this Driver */}
            <div className="space-y-2 pl-2 border-l-2 border-muted min-h-[20px]">
                {children}
                {orders.length === 0 && <p className="text-[10px] text-muted-foreground italic">No orders assigned</p>}
            </div>
        </div>
    )
}

/**
 * DROPPABLE UNASSIGNED AREA
 */
function UnassignedArea({ children, count }: { children: React.ReactNode, count: number }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unassigned-zone'
    })

    return (
        <div
            ref={setNodeRef}
            className="flex-1 flex flex-col min-h-0"
        >
            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-2 px-4 pt-2">
                <AlertCircle size={12} /> Unassigned ({count})
            </h2>
            <div
                className={`flex-1 overflow-y-auto p-4 space-y-3 transition-colors ${isOver ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
                {count === 0 && !isOver ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg bg-muted/50">
                        All orders assigned! 🎉
                    </div>
                ) : children}
            </div>
        </div>
    )
}


/**
 * MAIN PAGE COMPONENT
 */
export default function PlannerPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { theme } = useTheme()

    // Data State
    const [orders, setOrders] = useState<Order[]>([])
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null) // For Quick View Sheet

    // Map State
    const [mapCenter, setMapCenter] = useState<[number, number]>([34.0522, -118.2437])

    // Drag State
    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    )

    useEffect(() => {
        fixLeafletIcons() // Run Leaflet Fix
        fetchData()

        // Realtime Subscription
        const channel = supabase
            .channel('planner_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchData() {
        setIsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { router.push('/login'); return }

            // Get User
            const { data: user } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single()
            if (!user || user.role === 'driver') { router.replace('/orders'); return }

            // Get Active Data
            const [ordersRes, driversRes] = await Promise.all([
                supabase.from('orders').select('*').eq('company_id', user.company_id).neq('status', 'delivered'),
                supabase.from('drivers').select('*').eq('company_id', user.company_id).eq('status', 'active')
            ])

            if (ordersRes.data) setOrders(ordersRes.data)
            if (driversRes.data) setDrivers(driversRes.data)

            // Center Map
            if (ordersRes.data?.[0]?.latitude) {
                setMapCenter([ordersRes.data[0].latitude!, ordersRes.data[0].longitude!])
            }
        } catch (e) { console.error(e) }
        finally { setIsLoading(false) }
    }

    async function handleOptimize() {
        // Validation Checks
        if (drivers.length === 0) {
            toast({
                title: "Optimization Failed",
                description: "No active drivers found. Please go to the 'Drivers' page and mark drivers as Active.",
                type: 'error',
            })
            return
        }

        if (orders.length === 0) {
            toast({
                title: "Optimization Failed",
                description: "No orders found to optimize.",
                type: 'error',
            })
            return
        }

        // if (!confirm('Run Smart Optimization? This will reassign unlocked orders.')) return

        setIsLoading(true)
        try {
            // dynamic import the optimizer only when needed
            const { optimizeRoute } = await import('@/lib/optimizer')

            // Filter out cancelled/delivered orders from auto-optimization
            const ordersToOptimize = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered')

            // Check for orders without GPS
            const noGpsCount = ordersToOptimize.filter(o => !o.latitude || !o.longitude).length
            if (noGpsCount > 0) {
                toast({
                    title: "Optimization Partial Warning",
                    description: `${noGpsCount} orders were skipped because they lack GPS coordinates. Please check their addresses.`,
                    type: 'error'
                })
            }

            // Run the algorithm
            const result = await optimizeRoute(ordersToOptimize, drivers)

            // Update Local State
            setOrders(result.orders)

            // Save to Database (Batch Update)
            const updates = result.orders.map(o => ({
                ...o, // KEEP ALL EXISTING DATA (company_id, customer_name, etc.)
                driver_id: o.driver_id,
                status: o.driver_id ? 'assigned' : 'pending',
                route_index: o.route_index || null,
            }))

            const { error } = await supabase.from('orders').upsert(updates)

            if (error) {
                console.error("SUPABASE UPSERT ERROR:", error)
                throw error
            }
            toast({
                title: "Optimization Complete",
                description: "Routes have been updated.",
                type: 'success',
            })

        } catch (error: any) {
            console.error("FULL OPTIMIZATION ERROR OBJECT:", error)

            // Try to extract useful info
            let msg = 'Unknown Error'
            if (error?.message) msg = error.message
            if (error?.code) msg += ` (Code: ${error.code})`
            if (error?.details) msg += ` Details: ${error.details}`
            if (error?.hint) msg += ` Hint: ${error.hint}`

            alert(`Optimization Failed: ${msg}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Handlers
    function handleDragStart(event: DragStartEvent) {
        setActiveDragId(event.active.id as string)
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        setActiveDragId(null)

        if (!over) return

        const orderId = active.id as string
        const targetId = over.id as string

        // Determine destination
        let newDriverId: string | null = null
        if (targetId.startsWith('driver-')) {
            newDriverId = targetId.replace('driver-', '')
        } else if (targetId === 'unassigned-zone') {
            newDriverId = null
        } else {
            return // Dropped somewhere invalid
        }

        // Optimistic Update
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    driver_id: newDriverId,
                    status: newDriverId ? 'assigned' : 'pending',
                    // Lock if assigned to a driver manually
                    locked_to_driver: !!newDriverId
                }
            }
            return o
        }))

        // Database Update
        const { error } = await supabase
            .from('orders')
            .update({
                driver_id: newDriverId,
                status: newDriverId ? 'assigned' : 'pending',
                locked_to_driver: !!newDriverId
            })
            .eq('id', orderId)

        if (error) {
            console.error('Failed to update order:', error)
            fetchData() // Revert
        }
    }

    // Map Theme
    const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(() => theme === 'dark' ? 'dark' : 'light')

    function toggleMapTheme() {
        setMapTheme(prev => prev === 'light' ? 'dark' : 'light')
    }

    // Derived State
    const unassignedOrders = orders.filter(o => !o.driver_id)
    const activeDragOrder = orders.find(o => o.id === activeDragId)

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen w-full bg-background overflow-hidden">
                {/* SIDEBAR */}
                <div className="w-96 border-r border-border flex flex-col bg-card dark:bg-card z-20 shadow-xl transition-colors">
                    <div className="p-4 border-b border-border bg-muted/20 dark:bg-muted/10">
                        <h1 className="text-xl font-bold tracking-tight mb-1 text-foreground">Route Planner</h1>
                        <p className="text-xs text-muted-foreground">Drag orders to assign manually.</p>
                    </div>

                    <div className="p-4 border-b border-border bg-card">
                        <Button
                            onClick={handleOptimize}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-95 border-0"
                        >
                            <Sparkles size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            {isLoading ? 'Optimizing...' : 'Smart Optimize'}
                        </Button>
                    </div>

                    {/* Draggable Unassigned List */}
                    <UnassignedArea count={unassignedOrders.length}>
                        {unassignedOrders.map(order => (
                            <DraggableOrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
                        ))}
                    </UnassignedArea>

                    {/* Droppable Drivers List */}
                    <div className="h-2/5 border-t border-border bg-muted/10 flex flex-col">
                        <div className="p-3 border-b border-border bg-muted/30">
                            <h2 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                                <Truck size={12} /> Drivers ({drivers.length})
                            </h2>
                        </div>
                        <div className="overflow-y-auto p-3 space-y-3 flex-1">
                            {drivers.map(driver => (
                                <DroppableDriverContainer
                                    key={driver.id}
                                    driver={driver}
                                    orders={orders.filter(o => o.driver_id === driver.id)}
                                >
                                    {orders.filter(o => o.driver_id === driver.id).map(order => (
                                        <DraggableOrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
                                    ))}
                                </DroppableDriverContainer>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAP AREA */}
                <div className="flex-1 relative z-10">
                    {/* Map Theme Toggle */}
                    <div className="absolute top-4 right-4 z-[500]">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="shadow-lg h-10 w-10 rounded-full border border-primary/20 bg-background/80 backdrop-blur"
                            onClick={toggleMapTheme}
                            title="Toggle Map Theme"
                        >
                            {mapTheme === 'dark' ? '🌙' : '☀️'}
                        </Button>
                    </div>

                    <div style={{ height: '100%', width: '100%' }}>
                        <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}`} center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url={mapTheme === 'dark'
                                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                            />
                            {/* Driver Meters (Depots) */}
                            {drivers.map(driver => (
                                driver.default_start_lat && driver.default_start_lng && (
                                    <Marker
                                        key={`driver-${driver.id}`}
                                        position={[driver.default_start_lat, driver.default_start_lng]}
                                        icon={typeof window !== 'undefined' ? require('leaflet').icon({
                                            iconUrl: 'https://cdn-icons-png.flaticon.com/512/713/713342.png',
                                            iconSize: [30, 30],
                                            className: 'hue-rotate-180'
                                        }) : undefined}
                                    >
                                        <Popup>
                                            <div className="p-1">
                                                <strong className="block text-sm">{driver.name} (Start)</strong>
                                                <div className="text-xs text-slate-500">{driver.default_start_address}</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
                            {/* Driver Routes (Polylines) */}
                            {drivers.map((driver, index) => {
                                const driverOrders = orders
                                    .filter(o => o.driver_id === driver.id && o.latitude && o.longitude)
                                    .sort((a, b) => (a.route_index || 0) - (b.route_index || 0))

                                if (driverOrders.length === 0) return null

                                const positions: [number, number][] = []

                                // Start from depot if available
                                if (driver.default_start_lat && driver.default_start_lng) {
                                    positions.push([driver.default_start_lat, driver.default_start_lng])
                                }

                                // Add Order points
                                driverOrders.forEach(o => positions.push([o.latitude!, o.longitude!]))

                                // Assign color based on driver index
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1']
                                const color = colors[index % colors.length]

                                return (
                                    <React.Fragment key={`route-${driver.id}`}>
                                        <Polyline positions={positions} pathOptions={{ color, weight: 4, opacity: 0.7 }} />
                                    </React.Fragment>
                                )
                            })}

                            {/* Order Markers */}
                            {orders.map(order => {
                                if (!order.latitude || !order.longitude) return null

                                const isCancelled = order.status === 'cancelled'
                                const customIcon = (typeof window !== 'undefined' && isCancelled)
                                    ? require('leaflet').icon({
                                        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41],
                                        popupAnchor: [1, -34],
                                        className: 'hue-rotate-[140deg]' // Blue -> Red shift
                                    })
                                    : null

                                return (
                                    <Marker
                                        key={order.id}
                                        position={[order.latitude, order.longitude]}
                                        {...(customIcon ? { icon: customIcon } : {})}
                                    >
                                        <Popup>
                                            <div className="p-1">
                                                <strong className="block text-sm">{order.customer_name}</strong>
                                                <div className="text-xs text-slate-500 mb-1">{order.address}</div>
                                                <div className="flex gap-1">
                                                    <div className={`text-[10px] font-bold px-1 rounded w-fit ${order.driver_id ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {order.driver_id ? 'Assigned' : 'Unassigned'}
                                                    </div>
                                                    {order.route_index !== null && order.driver_id && (
                                                        <div className="text-[10px] font-bold px-1.5 rounded-full bg-slate-800 text-white">
                                                            #{order.route_index}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            })}
                        </MapContainer>
                    </div>
                </div>
            </div>

            {/* DRAG OVERLAY (Visual Feedback) */}
            <DragOverlay>
                {activeDragOrder ? <DraggableOrderCard order={activeDragOrder} isOverlay /> : null}
            </DragOverlay>

            {/* QUICK VIEW SHEET */}
            <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Order Details</SheetTitle>
                        <SheetDescription>#{selectedOrder?.order_number}</SheetDescription>
                    </SheetHeader>
                    {selectedOrder && (
                        <div className="space-y-4 mt-6">
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
                                <p className="font-semibold">{selectedOrder.customer_name}</p>
                                <p className="text-sm text-slate-600">{selectedOrder.phone}</p>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                                <p className="text-sm text-slate-800 bg-slate-50 p-2 rounded">{selectedOrder.address}, {selectedOrder.city}</p>
                            </div>

                            <div className="flex gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${selectedOrder.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium text-muted-foreground">Assigned Driver</h3>
                                    <p className="text-sm">{selectedOrder.driver_id ? drivers.find(d => d.id === selectedOrder.driver_id)?.name || 'Assigned' : 'Unassigned'}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button className="w-full" onClick={() => window.open(`/order-details?id=${selectedOrder.id}`, '_blank')}>
                                    <ExternalLink size={14} className="mr-2" />
                                    Open Full Editor
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

        </DndContext>
    )
}
