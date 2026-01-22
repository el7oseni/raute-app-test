import { useEffect } from "react"
import { geoService } from "@/lib/geo-service"
import { supabase } from "@/lib/supabase"

interface DriverTrackerProps {
    driverId: string
    isOnline: boolean
    userId?: string
}

export function DriverTracker({ driverId, isOnline, userId }: DriverTrackerProps) {
    useEffect(() => {
        if (userId) geoService.init(userId, supabase) // Pass authenticated client
    }, [userId])

    useEffect(() => {
        if (isOnline) {
            geoService.startTracking()
        } else {
            geoService.stopTracking()
        }
        return () => geoService.stopTracking()
    }, [isOnline])

    return null
}
