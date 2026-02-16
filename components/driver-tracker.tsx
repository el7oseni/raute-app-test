import { useEffect } from "react"
import { geoService } from "@/lib/geo-service"
import { supabase } from "@/lib/supabase"

interface DriverTrackerProps {
    driverId: string
    companyId?: string
    isOnline: boolean
    userId?: string
}

export function DriverTracker({ driverId, companyId, isOnline, userId }: DriverTrackerProps) {
    useEffect(() => {
        if (userId && driverId) geoService.init(userId, supabase, driverId, companyId)
    }, [userId, driverId, companyId])

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
