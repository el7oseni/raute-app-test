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
        // We now pass driverId to helper to avoid "None" issue in Diagnostics
        if (userId && driverId) geoService.init(userId, supabase, driverId, undefined) // We don't have companyId prop here yet, but driverId is most critical for diagnostics
    }, [userId, driverId])

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
