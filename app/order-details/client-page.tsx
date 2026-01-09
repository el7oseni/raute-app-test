"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, MapPin, Calendar, User as UserIcon, Phone, Package, Edit, Trash2, Clock, Undo2, CheckCircle2, Loader2, Camera as CameraIcon } from "lucide-react"
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

    // Controlled Form State
    const [formData, setFormData] = useState<Partial<Order>>({})
    const [isGeocodingReversed, setIsGeocodingReversed] = useState(false)

    useEffect(() => {
        fixLeafletIcons()
        if (orderId) {
            fetchOrder(true)
        }
    }, [orderId])

    // Sync Order to Form Data when Order Loads or Edit Sheet Opens
    useEffect(() => {
        if (order) {
            setFormData({
                order_number: order.order_number,
                customer_name: order.customer_name,
                address: order.address,
                city: order.city,
                state: order.state,
                zip_code: order.zip_code,
                phone: order.phone,
                delivery_date: order.delivery_date,
                notes: order.notes,
                latitude: order.latitude,
                longitude: order.longitude
            })
        }
    }, [order, isEditSheetOpen])

    async function fetchOrder(isInitial = false) {
        if (!orderId) {
            setIsLoading(false)
            return
        }
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

    async function updateOrderStatus(newStatus: string, proofUrl?: string | null) {
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
                distance: dist,
                proof_url: proofUrl
            })

            // Direct DB Update (for immediate feedback) because offlineManager might be async
            if (proofUrl) {
                await supabase.from('orders').update({
                    status: newStatus,
                    proof_url: proofUrl,
                    delivered_at: new Date().toISOString()
                }).eq('id', orderId)
            } else {
                // Fallback if offline manager handles it, but we do it explicitly here for safety
                // (Note: offlineManager implementation details might conflict, but explicit update is safer for MVP)
                await supabase.from('orders').update({
                    status: newStatus,
                    delivered_at: newStatus === 'delivered' ? new Date().toISOString() : null
                }).eq('id', orderId)
            }

            // Optimistic Update
            setOrder(prev => prev ? {
                ...prev,
                status: newStatus as any,
                delivered_at: newStatus === 'delivered' ? new Date().toISOString() : prev.delivered_at,
                // proof_url: proofUrl // Add to type if needed
            } : null)

        } catch (error) {
            alert('Failed to update status')
            console.error(error)
        }
    }

    // NEW: Reverse Geocoding when Pin Moves (Using Utility)
    async function handlePinUpdate(lat: number, lng: number) {
        // 1. Update State immediately (UI snappy)
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

        // 2. Fetch Address Details
        try {
            setIsGeocodingReversed(true)

            // Dynamic import to avoid circular dep if any, or just direct
            const { reverseGeocode } = await import("@/lib/geocoding")
            const data = await reverseGeocode(lat, lng)

            if (data) {
                // Update Form
                setFormData(prev => ({
                    ...prev,
                    address: data.address || prev.address,
                    city: data.city || prev.city,
                    state: data.state || prev.state,
                    zip_code: data.zip || prev.zip_code
                }))
            }
        } catch (error: any) {
            console.error("Reverse Geocoding Failed:", error)
            alert(`⚠️ Could not auto-fill address: ${error.message || "Unknown error"}`)
        } finally {
            setIsGeocodingReversed(false)
        }
    }

    async function handleDelete() {
        if (!orderId) return
        try { setIsDeleting(true); const { error } = await supabase.from('orders').delete().eq('id', orderId); if (error) throw error; router.push('/orders') } catch (error) { console.error(error) } finally { setIsDeleting(false) }
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!orderId || !order) {
            alert("Error: Order ID missing. Cannot save.")
            return
        }

        try {
            setIsUpdating(true)

            // Geocode if location is missing but address is present (Fallback)
            let finalLat = formData.latitude
            let finalLng = formData.longitude

            // Use utility for forward geocoding fallback too
            if (!finalLat || !finalLng) {
                const { geocodeAddress } = await import("@/lib/geocoding")
                const geocoded = await geocodeAddress(`${formData.address || ''}, ${formData.city || ''}, ${formData.state || ''} ${formData.zip_code || ''}`)
                if (geocoded) {
                    finalLat = geocoded.lat
                    finalLng = geocoded.lng
                }
            }

            const updatedPayload = {
                order_number: formData.order_number,
                customer_name: formData.customer_name,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zip_code,
                phone: formData.phone,
                delivery_date: formData.delivery_date,
                notes: formData.notes,
                latitude: finalLat,
                longitude: finalLng,
            }

            const { error } = await supabase.from('orders').update(updatedPayload).eq('id', orderId)
            if (error) throw error

            // Update Local State & Close
            setOrder(prev => prev ? { ...prev, ...updatedPayload } as Order : null)
            setIsEditSheetOpen(false)
            alert("✅ Changes Saved Successfully!")

        } catch (error: any) {
            console.error("Update failed", error)
            alert(`❌ Failed to update order: ${error.message || 'Check connection'}`)
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
                            <div className="space-y-3">
                                <Button
                                    onClick={async () => {
                                        if (!confirm('Mark this order as delivered?')) return

                                        try {
                                            // 1. Capture Photo
                                            const { Camera, CameraResultType } = await import('@capacitor/camera')
                                            const image = await Camera.getPhoto({
                                                quality: 70,
                                                allowEditing: false,
                                                resultType: CameraResultType.Uri
                                            })

                                            // 2. Upload to Supabase if photo taken
                                            let proofUrl = null
                                            if (image.webPath) {
                                                const response = await fetch(image.webPath)
                                                const blob = await response.blob()
                                                const filename = `proof-${orderId}-${Date.now()}.jpg`

                                                const { data, error } = await supabase.storage
                                                    .from('proofs')
                                                    .upload(filename, blob)

                                                if (error) {
                                                    console.error('Upload failed:', error)
                                                } else if (data) {
                                                    const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(filename)
                                                    proofUrl = publicUrl
                                                }
                                            }

                                            // 3. Update Order
                                            updateOrderStatus('delivered', proofUrl)

                                        } catch (e) {
                                            console.error("Camera/Upload Error:", e)
                                            updateOrderStatus('delivered')
                                        }
                                    }}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white h-14 rounded-xl shadow-lg shadow-green-200 text-lg font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CameraIcon size={20} />
                                    <span>Capture Proof & Deliver</span>
                                </Button>
                                <p className="text-xs text-center text-slate-400">Photo required for completion</p>
                            </div>
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
                            <Button variant="outline" onClick={() => setIsEditSheetOpen(true)} className="w-full"><Edit size={16} className="mr-2" /> Edit</Button>
                            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="w-full"><Trash2 size={16} className="mr-2" /> Delete</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs & Sheets */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Order?</AlertDialogTitle><AlertDialogDescription>Permanently remove #{order.order_number}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Edit Order</SheetTitle>
                        <SheetDescription>Update order details and location.</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                        <Input value={formData.order_number || ''} onChange={e => setFormData(prev => ({ ...prev, order_number: e.target.value }))} placeholder="Order #" />
                        <Input value={formData.customer_name || ''} onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} placeholder="Customer Name" />

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase">GPS Location</h3>
                                {isGeocodingReversed && <div className="text-xs text-indigo-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Updating Address...</div>}
                            </div>
                            <LocationPicker
                                onLocationSelect={handlePinUpdate}
                                initialPosition={formData.latitude && formData.longitude ? { lat: formData.latitude, lng: formData.longitude } : undefined}
                            />
                            {formData.latitude != null && formData.longitude != null && <p className="text-xs text-blue-600 mt-2 font-mono">Pin: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}</p>}
                        </div>

                        <Input value={formData.address || ''} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Address" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input value={formData.city || ''} onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="City" />
                            <Input value={formData.state || ''} onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))} placeholder="State" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input value={formData.zip_code || ''} onChange={e => setFormData(prev => ({ ...prev, zip_code: e.target.value }))} placeholder="ZIP" />
                            <Input value={formData.phone || ''} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
                        </div>
                        <Input value={formData.delivery_date ? new Date(formData.delivery_date).toISOString().split('T')[0] : ''} onChange={e => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))} type="date" />
                        <textarea value={formData.notes || ''} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} className="w-full p-2 border rounded-md" placeholder="Notes" />
                        <Button type="submit" className="w-full" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    )
}
