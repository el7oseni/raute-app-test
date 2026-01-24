import { Order, Driver } from './supabase'

export interface SplitSuggestion {
    driverId: string
    driverName: string
    currentCount: number
    suggestedCount: number
    action: 'add' | 'remove' | 'keep'
    transfercount: number
}

/**
 * Calculates even split suggestions for drivers.
 * Attempts to distribute orders as evenly as possible.
 */
export function calculateEvenSplit(orders: Order[], drivers: Driver[]): SplitSuggestion[] {
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    const totalOrders = activeOrders.length
    const driverCount = drivers.length

    if (driverCount === 0) return []

    const targetPerDriver = Math.floor(totalOrders / driverCount)
    const remainder = totalOrders % driverCount

    // Current distribution
    const distribution = new Map<string, number>()
    drivers.forEach(d => distribution.set(d.id, 0))

    activeOrders.forEach(o => {
        if (o.driver_id && distribution.has(o.driver_id)) {
            distribution.set(o.driver_id, (distribution.get(o.driver_id) || 0) + 1)
        }
    })

    const suggestions: SplitSuggestion[] = []

    drivers.forEach((driver, index) => {
        // Distribute remainder one by one to first few drivers
        const myTarget = targetPerDriver + (index < remainder ? 1 : 0)
        const current = distribution.get(driver.id) || 0
        const diff = myTarget - current

        suggestions.push({
            driverId: driver.id,
            driverName: driver.name,
            currentCount: current,
            suggestedCount: myTarget,
            action: diff > 0 ? 'add' : diff < 0 ? 'remove' : 'keep',
            transfercount: Math.abs(diff)
        })
    })

    return suggestions
}
