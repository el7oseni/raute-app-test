import type { Driver } from './supabase'

/** How many minutes without a location update before a driver is considered offline */
const ONLINE_THRESHOLD_MINUTES = 3

/**
 * Determine if a driver is truly online based on their last location update.
 * This is the single source of truth — do NOT rely on `is_online` boolean alone,
 * because it can get stuck as `true` when the driver force-stops the app.
 */
export function isDriverOnline(driver: Pick<Driver, 'last_location_update' | 'is_online'>): boolean {
    // If the driver explicitly toggled offline, respect that
    if (!driver.is_online) return false

    // If they toggled online but never sent a location, they're not truly online
    if (!driver.last_location_update) return false

    const lastUpdate = new Date(driver.last_location_update).getTime()
    const now = Date.now()
    const minutesAgo = (now - lastUpdate) / 1000 / 60

    return minutesAgo < ONLINE_THRESHOLD_MINUTES
}

/**
 * Get a human-readable "last seen" string from a driver's last_location_update.
 */
export function getLastSeenText(driver: Pick<Driver, 'last_location_update'>): string {
    if (!driver.last_location_update) return 'Never'

    const lastUpdate = new Date(driver.last_location_update).getTime()
    const now = Date.now()
    const minutesAgo = Math.floor((now - lastUpdate) / 1000 / 60)

    if (minutesAgo < 1) return 'Just now'
    if (minutesAgo < 60) return `${minutesAgo}m ago`
    const hoursAgo = Math.floor(minutesAgo / 60)
    if (hoursAgo < 24) return `${hoursAgo}h ago`
    return `${Math.floor(hoursAgo / 24)}d ago`
}
