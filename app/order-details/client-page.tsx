"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, User as UserIcon, Phone, Package, Edit, Trash2, Clock, Undo2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase, type Order } from "@/lib/supabase"
import dynamic from "next/dynamic"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { offlineManager } from '@/lib/offline-manager'
import { geoService } from '@/lib/geo-service'
import LocationPicker from "@/components/location-picker"

// Dynamically import map to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// Fix Leaflet issue
const fixLeafletIcons = () => {
    if (typeof window !== 'undefined') {
        const L = require('leaflet')
        if (L.Icon.Default.prototype._getIconUrl) {
            delete (L.Icon.Default.prototype as any)._getIconUrl
        }
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
    }
}

const statusColors = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
}

export default function ClientOrderDetails() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orderId = searchParams.get('id')

    const [order, setOrder] = useState<Order | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [drivers, setDrivers] = useState<any[]>([])
    const [editLocation, setEditLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        fixLeafletIcons()
        if (orderId) {
            if (orderId) {
                fetchOrder(true)
            }
        }
    }, [orderId])

    async function fetchOrder(isInitial = false) {
        if (!orderId) return
        try {
            if (isInitial) setIsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('role, company_id')
                    .eq('id', user.id)
                    .maybeSingle()

                if (userProfile) {
                    setUserRole(userProfile.role)
                    if (userProfile.role !== 'driver') {
                        // Fetch drivers with 'is_online' status
                        const { data: driversData } = await supabase
                            .from('drivers')
                            .select('id, name, is_online, vehicle_type')
                            .eq('company_id', userProfile.company_id)
                            .eq('status', 'active')
                            .order('name')

                        setDrivers(driversData || [])
                    }
                }
            }
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single()

            if (error) throw error
            setOrder(data)
        } catch (error) {
            console.error('Error fetching order:', error)
        } finally {
            if (isInitial) setIsLoading(false)
        }
    }


    // Helper to calc distance in meters
    function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function updateOrderStatus(newStatus: string) {
        if (!order || !orderId) return
        try {
            let locationPayload = null
            let isOutOfRange = false
            let dist = 0

            // 📍 Anti-Fraud: Strict Location Check
            if (newStatus === 'delivered') {
                const loc = await geoService.getCurrentLocation()

                if (!loc) {
                    alert("❌ Location Required!\n\nYou must enable GPS/Location to mark an order as delivered. This is for proof of delivery.")
                    return // STOP: Do not update status
                }

                locationPayload = { lat: loc.lat, lng: loc.lng }

                // Check distance if order has lat/lng
                if (order.latitude && order.longitude) {
                    dist = getDistanceMeters(loc.lat, loc.lng, order.latitude, order.longitude)
                    console.log("Delivery Distance:", dist)

                    // Flag if > 500 meters (approx 0.3 miles)
                    if (dist > 500) {
                        isOutOfRange = true
                        // toast({ title: "Location Warning", description: "You are far from the destination, but delivery is saved.", type: "info" })
                    }
                }
            }

            await offlineManager.queueAction('UPDATE_ORDER_STATUS', {
                orderId,
                status: newStatus,
                location: locationPayload,
                outOfRange: isOutOfRange,
                distance: dist
            })

            // Optimistic Update
            setOrder(prev => prev ? {
                ...prev,
                status: newStatus as any,
                delivered_at: newStatus === 'delivered' ? new Date().toISOString() : prev.delivered_at,
            } : null)

        } catch (error) {
            alert('Failed to update status')
            console.error(error)
        }
    }

    async function geocodeAddress(address: string, city?: string, state?: string, zipCode?: string): Promise<{ lat: number; lon: number } | null> {
        try {
            const parts = [address, city, state, zipCode].filter(Boolean)
            const fullAddress = parts.join(', ')

            // Add timeout for geocoding
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`, {
                headers: { 'User-Agent': 'Raute Delivery App' },
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            const data = await response.json()
            if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
            return null
        } catch (error) {
            console.error("Geocoding failed/timed out", error)
            return null
        }
    }

    async function handleDelete() {
        if (!orderId) return
        try { setIsDeleting(true); const { error } = await supabase.from('orders').delete().eq('id', orderId); if (error) throw error; router.push('/orders') } catch (error) { console.error(error) } finally { setIsDeleting(false) }
    }

    async function handleEdit(formData: FormData) {
        if (!orderId || !order) return
        try {
            setIsUpdating(true);
            const address = formData.get('address') as string;
            const city = formData.get('city') as string;
            const state = formData.get('state') as string;
            const zipCode = formData.get('zip_code') as string;

            // 1. Try Geocoding
            const geocoded = await geocodeAddress(address, city, state, zipCode);

            // 2. Determine Final Coords
            // Logic: If user MANUALLY moved the pin (editLocation !== order.lat/lng), prioritize Manual.
            // If user didn't move pin, but Geocode found something new (address changed), use Geocoded.
            // Fallback: Use old order location (if geocode fails and user didn't touch pin).

            let finalLat = order.latitude
            let finalLng = order.longitude

            const isManualMove = editLocation && (Number(editLocation.lat) !== Number(order.latitude) || Number(editLocation.lng) !== Number(order.longitude))

            if (isManualMove && editLocation) {
                finalLat = editLocation.lat
                finalLng = editLocation.lng
            } else if (geocoded) {
                finalLat = geocoded.lat
                finalLng = geocoded.lon
            } else if (editLocation) {
                // Fallback to whatever is in the picker (which defaults to old location) if geocode fails
                finalLat = editLocation.lat
                finalLng = editLocation.lng
            }

            const updatedOrder = {
                order_number: formData.get('order_number') as string,
                customer_name: formData.get('customer_name') as string,
                address,
                city,
                state,
                zip_code: zipCode,
                phone: formData.get('phone') as string,
                delivery_date: formData.get('delivery_date') as string,
                notes: formData.get('notes') as string,
                latitude: finalLat,
                longitude: finalLng,
            };

            const { error } = await supabase.from('orders').update(updatedOrder).eq('id', orderId);
            if (error) throw error;

            // Refetch in background (don't show skeleton)
            await fetchOrder(false)

            setIsEditSheetOpen(false);
            // toast({ title: "Updated successfully", type: "success" }) // assuming toast exists or using alert for now if toast not imported
        } catch (error) {
            console.error("Update failed", error)
            alert('Failed to update order. Please check your connection.')
        } finally {
            setIsUpdating(false)
        }
    }

    function getMarkerColor(status: string) { const colors = { pending: '#eab308', assigned: '#3b82f6', in_progress: '#a855f7', delivered: '#22c55e', cancelled: '#ef4444' }; return colors[status as keyof typeof colors] || '#3b82f6' }

    function createColoredIcon(status: string) {
        if (typeof window === 'undefined') return undefined;
        const L = require('leaflet');
        return new L.divIcon({
            className: 'custom-marker',
            html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26c0-8.8-7.2-16-16-16z" fill="${getMarkerColor(status)}" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="white"/></svg>`,
            iconSize: [32, 42],
            iconAnchor: [16, 42],
            popupAnchor: [0, -42]
        })
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header Skeleton */}
                <div className="bg-white p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                </div>

                {/* Map Skeleton */}
                <div className="h-64 w-full bg-slate-200 animate-pulse relative">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>

                {/* Timeline Skeleton */}
                <div className="p-4 space-y-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <Skeleton className="h-5 w-40" />
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Bar Skeleton */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-2">
                        <Skeleton className="h-12 flex-1 rounded-xl" />
                        <Skeleton className="h-12 flex-1 rounded-xl" />
                    </div>
                </div>
            </div>
        )
    }
    if (!order) return <div className="p-4 flex flex-col items-center justify-center h-screen"><Package className="h-12 w-12 text-slate-300 mb-3" /><p className="text-slate-500">Order not found</p><Button onClick={() => router.push('/orders')} className="mt-4">Back to Orders</Button></div>

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="p-4 flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-9 w-9 p-0 rounded-full hover:bg-slate-100"><ArrowLeft size={20} /></Button>
                    <div className="flex-1"><h1 className="text-base font-bold text-slate-900 leading-tight">#{order.order_number}</h1><p className="text-xs text-slate-500">{order.customer_name}</p></div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${statusColors[order.status as keyof typeof statusColors]}`}>{order.status.replace("_", " ")}</span>
                </div>
            </div>

            {/* Map Section */}
            {order.latitude && order.longitude && (
                <div className="h-56 w-full relative border-b border-slate-200">
                    <MapContainer center={[order.latitude, order.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} className="z-0">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                        <Marker position={[order.latitude, order.longitude]} icon={createColoredIcon(order.status)}><Popup>{order.customer_name}</Popup></Marker>
                    </MapContainer>
                </div>
            )}

            {/* Content & Logic Area */}
            <div className="p-4 space-y-4 max-w-lg mx-auto">
                {/* 🚨 DRIVER ACTIONS */}
                {userRole === 'driver' && (
                    <div className="space-y-3">
                        {order.status === 'delivered' ? (
                            <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center space-y-3 animate-in fade-in slide-in-from-bottom-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600"><CheckCircle2 size={24} /></div>
                                <div><h3 className="font-bold text-green-800 text-lg">Order Delivered!</h3><p className="text-sm text-green-700">Time: {new Date(order.delivered_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                                <Button variant="outline" size="sm" onClick={() => { if (confirm('Undo delivery status?')) updateOrderStatus('in_progress') }} className="w-full border-green-200 text-green-700 hover:bg-green-100 mt-2 bg-transparent"><Undo2 size={14} className="mr-2" />Undo / Not Delivered</Button>
                            </div>
                        ) : order.status === 'cancelled' ? (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center text-red-700 font-medium">This order is cancelled.</div>
                        ) : (
                            <Button onClick={() => { if (confirm('Mark this order as delivered?')) updateOrderStatus('delivered') }} className="w-full bg-green-600 hover:bg-green-700 text-white h-14 rounded-xl shadow-lg shadow-green-200 text-lg font-bold transition-all active:scale-95">Mark as Delivered</Button>
                        )}
                    </div>
                )}

                {/* Info Cards */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
                    <div className="p-4 flex gap-4"><div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0"><UserIcon size={20} /></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Customer</p><p className="font-medium text-slate-900">{order.customer_name}</p>{order.phone && (<a href={`tel:${order.phone}`} className="text-blue-600 text-sm font-medium flex items-center gap-1 mt-1"><Phone size={12} /> {order.phone}</a>)}</div></div>
                    <div className="p-4 flex gap-4"><div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0"><MapPin size={20} /></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Address</p><p className="font-medium text-slate-900">{order.address}</p><p className="text-sm text-slate-500">{[order.city, order.state].filter(Boolean).join(', ')}</p><a href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-full mt-2 hover:bg-blue-100 transition-colors">Open in Google Maps</a></div></div>
                    {order.notes && (<div className="p-4 bg-yellow-50/50"><p className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-1">Driver Notes</p><p className="text-sm text-slate-700 italic">"{order.notes}"</p></div>)}
                </div>

                {/* 🔒 MANAGER ACTIONS 🔒 */}
                {userRole !== 'driver' && (
                    <div className="space-y-4 pt-4">
                        {/* Status Update */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Update Status</label>
                            <select value={order.status} onChange={(e) => updateOrderStatus(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50">
                                <option value="pending">🟡 Pending</option>
                                <option value="assigned">🔵 Assigned</option>
                                <option value="in_progress">🟣 In Progress</option>
                                <option value="delivered">🟢 Delivered</option>
                                <option value="cancelled">🔴 Cancelled</option>
                            </select>
                        </div>

                        {/* Assign Driver With ONLINE Status */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Assign Driver</label>
                            <select
                                value={order.driver_id || ''}
                                onChange={async (e) => {
                                    const driverId = e.target.value || null
                                    const { error } = await supabase.from('orders').update({ driver_id: driverId, status: driverId ? 'assigned' : 'pending' }).eq('id', orderId)
                                    if (!error) fetchOrder()
                                }}
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium bg-slate-50"
                            >
                                <option value="">Unassigned</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id} className={!driver.is_online ? 'text-slate-400' : 'text-green-700 font-bold'}>
                                        {driver.is_online ? '🟢' : '⚪'} {driver.name} {!driver.is_online ? '(Offline)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => {
                                setEditLocation(order.latitude && order.longitude ? { lat: order.latitude, lng: order.longitude } : null)
                                setIsEditSheetOpen(true)
                            }} className="w-full"><Edit size={16} className="mr-2" /> Edit</Button>
                            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="w-full"><Trash2 size={16} className="mr-2" /> Delete</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs & Sheets */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Order?</AlertDialogTitle><AlertDialogDescription>Permanently remove #{order.order_number}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}><SheetContent side="bottom" className="h-[90vh] overflow-y-auto"><SheetHeader><SheetTitle>Edit Order</SheetTitle></SheetHeader><form onSubmit={(e) => { e.preventDefault(); handleEdit(new FormData(e.currentTarget)) }} className="space-y-4 mt-4"><Input name="order_number" defaultValue={order.order_number} placeholder="Order #" /><Input name="customer_name" defaultValue={order.customer_name} placeholder="Customer Name" /><Input name="address" defaultValue={order.address} placeholder="Address" /><div className="grid grid-cols-2 gap-4"><Input name="city" defaultValue={order.city || ''} placeholder="City" /><Input name="state" defaultValue={order.state || ''} placeholder="State" /></div><div className="grid grid-cols-2 gap-4"><Input name="zip_code" defaultValue={order.zip_code || ''} placeholder="ZIP" /><Input name="phone" defaultValue={order.phone || ''} placeholder="Phone" /></div><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><h3 className="text-xs font-bold text-slate-500 uppercase mb-2">GPS Location (Fix "No GPS" errors)</h3><LocationPicker onLocationSelect={(lat, lng) => setEditLocation({ lat, lng })} initialPosition={editLocation} />{editLocation && <p className="text-xs text-blue-600 mt-2 font-mono">Pin: {editLocation.lat.toFixed(5)}, {editLocation.lng.toFixed(5)}</p>}</div><Input name="delivery_date" type="date" defaultValue={order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : ''} /><textarea name="notes" className="w-full p-2 border rounded-md" defaultValue={order.notes || ''} placeholder="Notes" /><Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button></form></SheetContent></Sheet>
        </div>
    )
}
