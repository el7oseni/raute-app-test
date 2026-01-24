import { supabase, Order, Driver } from './supabase'

export interface WorkloadData {
    driverId: string
    driverName: string
    dailyCounts: { date: string, count: number }[]
    total: number
    average: number
}

// Helper to get start of day in UTC nicely? Or just use ISO strings.
// We'll use simple string matching for dates to avoid timezone headaches for now, 
// assuming database stores UTC timestamps.

export async function getWorkloadHistory(companyId: string, days: number = 7): Promise<WorkloadData[]> {
    // 1. Get all drivers for this company
    const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')

    if (!drivers || drivers.length === 0) return []

    // 2. Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 3. Fetch DELIVERED orders in this range
    const { data: orders } = await supabase
        .from('orders')
        .select('driver_id, delivered_at')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', startDate.toISOString())

    // 4. Group by Driver and Date
    const workloadMap = new Map<string, Map<string, number>>()

    // Initialize map
    drivers.forEach(d => {
        workloadMap.set(d.id, new Map())
    })

    // Fill with data
    orders?.forEach(order => {
        if (!order.driver_id || !order.delivered_at) return

        // Extract YYYY-MM-DD
        const dateStr = new Date(order.delivered_at).toISOString().split('T')[0]

        const driverDates = workloadMap.get(order.driver_id)
        if (driverDates) {
            driverDates.set(dateStr, (driverDates.get(dateStr) || 0) + 1)
        }
    })

    // 5. Format Output
    return drivers.map(driver => {
        const driverDates = workloadMap.get(driver.id) || new Map()
        const dailyCounts: { date: string, count: number }[] = []
        let total = 0

        // Generate last N days entries (filling zeros)
        for (let i = 0; i < days; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]

            const count = driverDates.get(dateStr) || 0
            dailyCounts.unshift({ date: dateStr, count }) // Push to front to have oldest first

            total += count
        }

        return {
            driverId: driver.id,
            driverName: driver.name,
            dailyCounts,
            total,
            average: parseFloat((total / days).toFixed(1))
        }
    })
}

export async function getTeamAverageWorkload(companyId: string, days: number = 7): Promise<number> {
    const data = await getWorkloadHistory(companyId, days)
    if (data.length === 0) return 0
    const totalAll = data.reduce((sum, d) => sum + d.total, 0)
    return parseFloat((totalAll / data.length).toFixed(1))
}
