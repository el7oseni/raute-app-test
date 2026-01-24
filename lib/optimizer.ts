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
    debug?: any // Allow passing back debug info
}

// Maximum allowed distance for auto-assignment (in km)
// Prevents cross-continent assignments (e.g. US driver -> Egypt Order)
const MAX_ASSIGNMENT_DISTANCE_KM = 2500

// Penalty per existing order to encourage load balancing (in effective km)
const LOAD_PENALTY_KM = 10

export type OptimizationStrategy = 'fastest' | 'balanced' | 'efficient'

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
export async function optimizeRoute(
    orders: Order[],
    drivers: Driver[],
    strategy: OptimizationStrategy = 'fastest',
    mode: 'morning' | 'reoptimize' = 'morning'
): Promise<OptimizationResult> {

    let updatedOrders = [...orders]

    // FILTER: Ignore 'delivered' or 'cancelled' orders from re-assignment
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')

    // 0. Separate Pinned vs Unpinned Orders
    const pinnedOrders = activeOrders.filter(o => o.is_pinned && o.driver_id)
    const unpinnedOrders = activeOrders.filter(o => !pinnedOrders.includes(o))

    // 1. Available Orders (Pinned orders are excluded from optimization pool)
    const availableOrders = unpinnedOrders

    // Pre-Assign Pinned Orders directly
    pinnedOrders.forEach(order => {
        const orderIndex = updatedOrders.findIndex(o => o.id === order.id)
        if (orderIndex !== -1) {
            updatedOrders[orderIndex] = {
                ...updatedOrders[orderIndex],
                is_pinned: true,
                status: 'assigned'
            }
        }
    })

    // Map drivers to their starting positions
    // Fallback logic: If driver has NO location, we try to use the average location of their LOCKED orders, 
    // otherwise we skip auto-assigning to them (safer than defaulting to Cairo implied).
    const driverPositions = drivers.map(d => {
        let lat, lng, source, address

        // Priority 1: Manual Start Point (Manager override) -> ALWAYS FIRST
        if (d.use_manual_start && d.starting_point_lat && d.starting_point_lng) {
            lat = d.starting_point_lat
            lng = d.starting_point_lng
            address = d.starting_point_address || 'Manual Start Point'
            source = 'manual'
        }
        // Priority 2: Check Mode
        else if (mode === 'reoptimize') {
            // Mid-Day Mode: Prioritize Live GPS
            if (d.current_lat && d.current_lng) {
                lat = d.current_lat
                lng = d.current_lng
                address = 'Live Location'
                source = 'live'
            }
            // Fallback to Depot
            else if (d.default_start_lat && d.default_start_lng) {
                lat = d.default_start_lat
                lng = d.default_start_lng
                address = d.default_start_address || 'Default Depot'
                source = 'default'
            }
        }
        // Priority 3: Morning Mode (Default) -> Prioritize Depot
        else if (d.default_start_lat && d.default_start_lng) {
            lat = d.default_start_lat
            lng = d.default_start_lng
            address = d.default_start_address || 'Default Depot'
            source = 'default'
        }
        // Priority 4: Live GPS fallback for Morning Mode
        else if (d.current_lat && d.current_lng) {
            lat = d.current_lat
            lng = d.current_lng
            address = 'Live Location'
            source = 'live'
        }
        // Priority 4: Infer from locked orders (Last resort)
        else {
            const driversLockedOrders = pinnedOrders.filter(lo => lo.driver_id === d.id && lo.latitude)
            if (driversLockedOrders.length > 0) {
                lat = driversLockedOrders[0].latitude
                lng = driversLockedOrders[0].longitude
                address = 'Inferred from Orders'
                source = 'inferred'
            }
        }

        return {
            id: d.id,
            name: d.name,
            lat,
            lng,
            address,
            load: pinnedOrders.filter(o => o.driver_id === d.id).length,
            valid: !!(lat && lng), // Only optimize for drivers with a known location
            source
        }
    })

    // ... (rest of the file remains same until return)
    // Actually, I can't skip the middle with replace_file_content easily if I changed the map.
    // But wait, the return statement is all I need to change if I change the map above?
    // No, I need to change the map above.
    // And then the return statement at the bottom needs to pick it up.

    // I will split this into two tool calls to be safe.
    // First call: Update the driverPositions map.


    // Determine Strategy Weights
    // Fastest: Low penalty (0.5km equivalent) -> Focus on proximity
    // Balanced: High penalty (50km equivalent) -> Focus on equal count
    // Efficient: Moderate (10km equivalent) -> Trade-off
    let loadBalanceWeight = 10
    if (strategy === 'fastest') loadBalanceWeight = 0.5
    else if (strategy === 'balanced') loadBalanceWeight = 50
    else loadBalanceWeight = 10

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
            const loadPenalty = driver.load * loadBalanceWeight
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
                    is_pinned: false
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
        // Note: With priority sorting, this logic might need adjustment if the first order is urgent but far away.
        // But generally, we route from start point.
        if ((!currentLat || !currentLng) && driverOrders[0].latitude) {
            currentLat = driverOrders[0].latitude
            currentLng = driverOrders[0].longitude
        }

        const sortedDriverOrders: Order[] = []
        let unrouted = [...driverOrders]

        // SORT CANDIDATES BY PRIORITY FIRST, THEN TIME WINDOW
        // We want to process Urgent orders first in the route if possible? 
        // OR do we just sequence them first?
        // The requirement is "Urgent orders will be delivered first in the route sequence".
        // So we should pick them first.

        // Priority value map
        const getPriorityValue = (o: Order) => {
            if (o.priority_level === 'critical') return 3
            if (o.priority_level === 'high') return 2
            return 1
        }

        // Sort unrouted set:
        // 1. Pinned (Always top)
        // 2. Time Window (Earliest Start First) - Hard Constraint
        // 3. Priority (Critical > High > Normal) - Soft Constraint
        unrouted.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1

            // 1. Time Window Check
            // If both have windows, earlier window start goes first
            if (a.time_window_start && b.time_window_start) {
                return a.time_window_start.localeCompare(b.time_window_start)
            }
            // Orders WITH windows generally take precedence (Scheduled > Flexible)
            if (a.time_window_start && !b.time_window_start) return -1
            if (!a.time_window_start && b.time_window_start) return 1

            // 2. Priority
            const pA = getPriorityValue(a)
            const pB = getPriorityValue(b)
            return pB - pA
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
        },
        debug: {
            drivers: driverPositions.map(d => ({ name: d.name, valid: d.valid, lat: d.lat, lng: d.lng, address: d.address })),
        }
    }
}
