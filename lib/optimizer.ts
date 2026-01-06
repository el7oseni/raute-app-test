import { Driver, Order } from './supabase'

/**
 * OPTIMIZER CONFIGURATION
 */
interface OptimizationResult {
    orders: Order[]
    summary: {
        totalDistance: number
        unassignedCount: number
    }
}

// Maximum allowed distance for auto-assignment (in km)
// Prevents cross-continent assignments (e.g. US driver -> Egypt Order)
const MAX_ASSIGNMENT_DISTANCE_KM = 2500

// Penalty per existing order to encourage load balancing (in effective km)
const LOAD_PENALTY_KM = 10

/**
 * Calculates straight-line distance between two points (Haversine approximation)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
}

/**
 * MAIN OPTIMIZATION FUNCTION
 * 
 * Improved Logic:
 * 1. Filtering: Max Distance Constraint (No assignments > 2500km).
 * 2. Scoring: Distance + Load Penalty.
 * 3. Sorting: Respect Time Windows inside driver routes.
 */
export async function optimizeRoute(orders: Order[], drivers: Driver[]): Promise<OptimizationResult> {

    let updatedOrders = [...orders]

    // FILTER: Ignore 'delivered' or 'cancelled' orders from re-assignment
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')

    // 1. Separate Locked vs Unlocked Orders
    const lockedOrders = activeOrders.filter(o => o.locked_to_driver && o.driver_id)
    const availableOrders = activeOrders.filter(o => !o.locked_to_driver)

    // Map drivers to their starting positions
    // Fallback logic: If driver has NO location, we try to use the average location of their LOCKED orders, 
    // otherwise we skip auto-assigning to them (safer than defaulting to Cairo implied).
    const driverPositions = drivers.map(d => {
        let lat = d.current_lat || d.default_start_lat
        let lng = d.current_lng || d.default_start_lng

        // If no start location, check if they have locked orders to infer a "region"
        if (!lat || !lng) {
            const driversLockedOrders = lockedOrders.filter(lo => lo.driver_id === d.id && lo.latitude)
            if (driversLockedOrders.length > 0) {
                lat = driversLockedOrders[0].latitude
                lng = driversLockedOrders[0].longitude
            }
        }

        return {
            id: d.id,
            lat,
            lng,
            load: lockedOrders.filter(o => o.driver_id === d.id).length,
            valid: !!(lat && lng) // Only optimize for drivers with a known location
        }
    })

    // 2. Assign Available Orders to Nearest Valid Driver
    for (const order of availableOrders) {
        if (!order.latitude || !order.longitude) continue;

        let bestDriverId = null
        let minScore = Infinity

        for (const driver of driverPositions) {
            if (!driver.valid || !driver.lat || !driver.lng) continue

            // Calculate Distance Score
            const distance = getDistance(driver.lat, driver.lng, order.latitude, order.longitude)

            // 🚫 CONSTRAINT: Max Distance Check
            if (distance > MAX_ASSIGNMENT_DISTANCE_KM) continue

            // Calculate Load Balance Score
            const loadPenalty = driver.load * LOAD_PENALTY_KM
            const totalScore = distance + loadPenalty

            if (totalScore < minScore) {
                minScore = totalScore
                bestDriverId = driver.id
            }
        }

        if (bestDriverId) {
            // Assign Order
            const orderIndex = updatedOrders.findIndex(o => o.id === order.id)
            if (orderIndex !== -1) {
                updatedOrders[orderIndex] = {
                    ...updatedOrders[orderIndex],
                    driver_id: bestDriverId,
                    status: 'assigned',
                    locked_to_driver: false
                }

                // Update Driver Load
                const driverPos = driverPositions.find(d => d.id === bestDriverId)
                if (driverPos) driverPos.load++
            }
        }
    }

    // 3. Sequence Orders (TSP-ish)
    const finalOrders: Order[] = []

    for (const driver of drivers) {
        let driverOrders = updatedOrders.filter(o => o.driver_id === driver.id)
        if (driverOrders.length === 0) continue

        // Start point
        let currentLat = driver.current_lat || driver.default_start_lat
        let currentLng = driver.current_lng || driver.default_start_lng

        // If no start point, use first order's location as start (implied start)
        if ((!currentLat || !currentLng) && driverOrders[0].latitude) {
            currentLat = driverOrders[0].latitude
            currentLng = driverOrders[0].longitude
        }

        const sortedDriverOrders: Order[] = []
        let unrouted = [...driverOrders]

        // Sort unrouted by Time Window Start
        unrouted.sort((a, b) => {
            if (a.time_window_start && !b.time_window_start) return -1
            if (!a.time_window_start && b.time_window_start) return 1
            if (a.time_window_start && b.time_window_start) return a.time_window_start.localeCompare(b.time_window_start)
            return 0
        })

        while (unrouted.length > 0) {
            // Greedy Nearest Neighbor from Top Candidates (to respect Time Window buckets)
            // Increased pool size to 12 to prevent "zigzagging" (skipping nearby stops because they were 4th or 5th in the list).
            // This allows better geographical clustering while still generally respecting the time-window sort order.
            const candidatePoolSize = 12 // Look ahead limit
            const candidates = unrouted.slice(0, candidatePoolSize)

            let bestNextIndex = -1
            let minDist = Infinity

            if (currentLat && currentLng) {
                for (let i = 0; i < candidates.length; i++) {
                    const o = candidates[i]
                    if (o.latitude && o.longitude) {
                        const dist = getDistance(currentLat, currentLng, o.latitude, o.longitude)
                        if (dist < minDist) {
                            minDist = dist
                            bestNextIndex = i
                        }
                    }
                }
            } else {
                // If we still have no GPS reference, just take the first one (Time Window priority)
                bestNextIndex = 0
            }

            if (bestNextIndex !== -1) {
                const nextOrder = candidates[bestNextIndex]
                const realIndex = unrouted.findIndex(u => u.id === nextOrder.id)

                sortedDriverOrders.push({
                    ...nextOrder,
                    route_index: sortedDriverOrders.length + 1
                })

                if (nextOrder.latitude && nextOrder.longitude) {
                    currentLat = nextOrder.latitude
                    currentLng = nextOrder.longitude
                }

                unrouted.splice(realIndex, 1)
            } else {
                // Fallback
                const fallback = unrouted.shift()
                if (fallback) sortedDriverOrders.push({ ...fallback, route_index: sortedDriverOrders.length + 1 })
            }
        }

        // --- POST-PROCESSING: 2-OPT OPTIMIZATION ---
        // The sortedDriverOrders is now a valid route, but might have "crossings" (zigzags).
        // We apply a simple 2-Opt pass to untangle these crossings and reduce travel time.

        let improvement = true
        while (improvement) {
            improvement = false
            for (let i = 0; i < sortedDriverOrders.length - 2; i++) {
                for (let j = i + 2; j < sortedDriverOrders.length - 1; j++) {
                    const A = sortedDriverOrders[i]
                    const B = sortedDriverOrders[i + 1]
                    const C = sortedDriverOrders[j]
                    const D = sortedDriverOrders[j + 1]

                    if (A.latitude && A.longitude && B.latitude && B.longitude &&
                        C.latitude && C.longitude && D.latitude && D.longitude) {

                        // Distance of current edges: A->B + C->D
                        const currentDist = getDistance(A.latitude, A.longitude, B.latitude, B.longitude) +
                            getDistance(C.latitude, C.longitude, D.latitude, D.longitude)

                        // Distance of swapped edges: A->C + B->D
                        const newDist = getDistance(A.latitude, A.longitude, C.latitude, C.longitude) +
                            getDistance(B.latitude, B.longitude, D.latitude, D.longitude)

                        // If swapping reduces total distance, perform the swap
                        if (newDist < currentDist) {
                            // Reverse the segment between i+1 and j
                            const segment = sortedDriverOrders.slice(i + 1, j + 1).reverse()
                            sortedDriverOrders.splice(i + 1, segment.length, ...segment)
                            improvement = true
                        }
                    }
                }
            }
        }

        // Re-assign correct indices after optimization
        sortedDriverOrders.forEach((o, index) => {
            o.route_index = index + 1
        })

        finalOrders.push(...sortedDriverOrders)
    }

    const unassigned = updatedOrders.filter(o => !o.driver_id)
    finalOrders.push(...unassigned)

    return {
        orders: finalOrders,
        summary: {
            totalDistance: 0,
            unassignedCount: unassigned.length
        }
    }
}
