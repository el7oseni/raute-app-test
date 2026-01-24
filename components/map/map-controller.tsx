"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import type { Order, Driver } from "@/lib/supabase"

export interface MapControllerProps {
    orders: Order[]
    drivers: Driver[]
    selectedDriverId: string | null
}

export default function MapController({ orders, drivers, selectedDriverId }: MapControllerProps) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        const points: [number, number][] = []

        // Add Order locations
        orders.forEach(o => {
            if (o.latitude && o.longitude) points.push([Number(o.latitude), Number(o.longitude)])
        })

        // Add Driver locations
        drivers.forEach(d => {
            if (d.current_lat && d.current_lng) points.push([d.current_lat, d.current_lng])
        })

        if (selectedDriverId) {
            // -- FOLLOW MODE --
            // If a specific driver is selected, lock camera to them (Zoom 16)
            const driver = drivers.find(d => d.id === selectedDriverId)
            if (driver?.current_lat && driver?.current_lng) {
                map.flyTo([driver.current_lat, driver.current_lng], 16, { animate: true, duration: 1.5 })
            }
        } else if (points.length > 0) {
            // -- GLOBAL OVERVIEW --
            // If no driver selected, show everything
            const bounds = L.latLngBounds(points)
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16,
                animate: true,
                duration: 1
            })
        }
    }, [orders, drivers, selectedDriverId, map])

    return null
}
