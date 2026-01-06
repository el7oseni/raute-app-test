"use client"

import { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"
import { MapPin, Package, Truck, User, Trash2 } from "lucide-react"
import { supabase, type Order, type Driver } from "@/lib/supabase"
import * as L from "leaflet" // Import Leaflet directly
import { useTheme } from "next-themes"
import type { MapControllerProps } from "@/components/map/map-controller"

// Dynamic Leaflet Components
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
)
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
)
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
)
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
)
const Polyline = dynamic(
    () => import("react-leaflet").then((mod) => mod.Polyline),
    { ssr: false }
)

const MapController = dynamic<MapControllerProps>(
    () => import("@/components/map/map-controller"),
    { ssr: false }
)

// -- Icon Generators --
const createOrderIcon = (status: string, index?: number) => {
    const colors = {
        pending: '#eab308',
        assigned: '#3b82f6',
        in_progress: '#a855f7',
        delivered: '#22c55e',
        cancelled: '#ef4444',
    }
    const color = colors[status as keyof typeof colors] || '#3b82f6'

    if (index !== undefined) {
        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background-color: ${color}; 
                    color: white; 
                    width: 28px; 
                    height: 28px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-family: sans-serif;
                    font-size: 14px;
                    border: 2px solid white; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                ">
                    ${index}
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        })
    }

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26c0-8.8-7.2-16-16-16z" 
                      fill="${color}" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>`,
        iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42]
    })
}

const createDriverIcon = (isOnline: boolean) => {
    return L.divIcon({
        className: 'driver-marker',
        html: `
            <div style="
                background-color: ${isOnline ? '#22c55e' : '#64748b'}; 
                width: 36px; height: 36px; 
                border-radius: 50%; 
                display: flex; align-items: center; justify-content: center; 
                border: 2px solid white; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                    <path d="M15 18H9"/>
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                    <circle cx="17" cy="18" r="2"/>
                    <circle cx="7" cy="18" r="2"/>
                </svg>
            </div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20]
    })
}


interface InteractiveMapProps {
    orders: Order[]
    drivers: Driver[]
    selectedDriverId: string | null
    userLocation: [number, number] | null
    forceTheme?: 'light' | 'dark'
}

export default function InteractiveMap({ orders, drivers, selectedDriverId, userLocation, forceTheme }: InteractiveMapProps) {
    const { theme } = useTheme()
    // Use forced theme if provided, otherwise fallback to system theme
    const currentTheme = forceTheme || theme
    const isDark = currentTheme === 'dark'

    // Fix default icons
    useEffect(() => {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
    }, [])

    // Filter logic
    const displayedOrders = useMemo(() => {
        if (!selectedDriverId) return orders
        return orders.filter(o => o.driver_id === selectedDriverId)
    }, [orders, selectedDriverId])

    const displayedDrivers = useMemo(() => {
        if (!selectedDriverId) return drivers
        return drivers.filter(d => d.id === selectedDriverId)
    }, [drivers, selectedDriverId])

    const routePositions = useMemo(() => {
        if (!selectedDriverId || displayedDrivers.length === 0 || displayedOrders.length === 0) return []
        const driver = displayedDrivers[0]
        if (!driver.current_lat || !driver.current_lng) return [] // if no current location, maybe use start location?

        const points: [number, number][] = []
        points.push([driver.current_lat, driver.current_lng])

        const sortedOrders = [...displayedOrders].sort((a, b) => (a.route_index || 0) - (b.route_index || 0))
        sortedOrders.forEach(o => {
            if (o.latitude && o.longitude) points.push([Number(o.latitude), Number(o.longitude)])
        })
        return points
    }, [displayedDrivers, displayedOrders, selectedDriverId])


    if (!userLocation) return <div className="h-full w-full bg-slate-100 dark:bg-slate-900 animate-pulse flex items-center justify-center"><MapPin className="animate-bounce" /></div>

    return (
        <MapContainer
            center={userLocation}
            zoom={13}
            className="h-full w-full bg-slate-100 dark:bg-slate-900 z-0"
            style={{ height: '100%', width: '100%', minHeight: '100%' }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={isDark
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            <MapController
                orders={displayedOrders}
                drivers={displayedDrivers}
                selectedDriverId={selectedDriverId}
            />

            {selectedDriverId && routePositions.length > 1 && (
                <Polyline
                    positions={routePositions}
                    color="#3b82f6"
                    weight={4}
                    opacity={0.8}
                    dashArray="10, 10"
                />
            )}

            {displayedOrders.map((order, index) => (
                order.latitude && order.longitude && (
                    <Marker
                        key={order.id}
                        position={[Number(order.latitude), Number(order.longitude)]}
                        icon={createOrderIcon(order.status, selectedDriverId ? index + 1 : undefined)}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <div className="flex items-start gap-2 mb-2">
                                    <Package size={16} className="mt-1 text-primary" />
                                    <div>
                                        <p className="font-semibold text-slate-900">#{order.order_number}</p>
                                        <p className="text-sm text-slate-600">{order.customer_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                    <p>{order.address}</p>
                                </div>
                                <div className="border-t mt-2 pt-2 flex justify-end">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            if (confirm(`Are you sure you want to delete order #${order.order_number}?`)) {
                                                const { error } = await supabase.from('orders').delete().eq('id', order.id)
                                                if (error) {
                                                    alert('Failed to delete order')
                                                    console.error(error)
                                                }
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}

            {displayedDrivers.map((driver) => (
                driver.current_lat && driver.current_lng && (
                    <Marker
                        key={driver.id}
                        position={[driver.current_lat, driver.current_lng]}
                        icon={createDriverIcon(driver.is_online || false)}
                        zIndexOffset={1000}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${driver.is_online ? 'bg-green-500' : 'bg-slate-500'}`}>
                                        <Truck size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{driver.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {driver.is_online ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}
        </MapContainer>
    )
}
