"use client"

import { Truck, Layers, CheckCircle2, AlertCircle, MapPinOff } from "lucide-react"
import type { Driver } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

interface FleetPanelProps {
    drivers: Driver[]
    orders: any[] // We'll refine this type
    selectedDriverId: string | null
    onSelectDriver: (driverId: string | null) => void
    className?: string
}

export function FleetPanel({ drivers, orders, selectedDriverId, onSelectDriver, className }: FleetPanelProps) {
    // Stats
    const totalOrders = orders.length
    const unassignedOrders = orders.filter(o => !o.driver_id).length
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length

    // Calculate drivers with active orders (working drivers)
    const driversWithActiveOrders = new Set(
        orders
            .filter(o => o.driver_id && o.status !== 'delivered' && o.status !== 'cancelled')
            .map(o => o.driver_id)
    ).size

    // Helper to get stats for a driver
    const getDriverStats = (driverId: string) => {
        const driverOrders = orders.filter(o => o.driver_id === driverId)
        const active = driverOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length
        const completed = driverOrders.filter(o => o.status === 'delivered').length
        const missingGps = driverOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && (!o.latitude || !o.longitude)).length
        return { active, completed, missingGps }
    }

    return (
        <div className={`flex flex-col h-full bg-background border-r ${className}`}>
            {/* Header */}
            <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
                <h2 className="font-bold text-lg mb-2">Fleet Command</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 p-2 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Orders</div>
                        <div className="text-xl font-bold text-primary">{activeOrders}</div>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-lg">
                        <div className="text-xs text-muted-foreground">Active Drivers</div>
                        <div className="text-xl font-bold text-green-600">
                            {driversWithActiveOrders}
                            <span className="text-muted-foreground text-sm font-normal">/{drivers.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-3 space-y-2">
                    {/* Global View Option */}
                    <Button
                        variant={selectedDriverId === null ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-auto py-3"
                        onClick={() => onSelectDriver(null)}
                    >
                        <div className="bg-primary/10 p-2 rounded-full text-primary shrink-0">
                            <Layers size={20} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-semibold">Global View</div>
                            <div className="text-xs text-muted-foreground">Map shows all operations</div>
                        </div>
                    </Button>

                    <div className="pt-2 pb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Drivers</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {drivers.length}
                        </span>
                    </div>

                    {drivers.map(driver => {
                        const stats = getDriverStats(driver.id)
                        const isSelected = selectedDriverId === driver.id

                        return (
                            <Button
                                key={driver.id}
                                variant={isSelected ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 h-auto py-3 border border-transparent ${isSelected ? 'border-primary/20' : ''}`}
                                onClick={() => onSelectDriver(driver.id)}
                            >
                                <div className="relative shrink-0">
                                    <div className={`p-2 rounded-full ${driver.is_online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <Truck size={20} />
                                    </div>
                                    {driver.is_online && (
                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 text-left overflow-hidden min-w-0">
                                    <div className="font-semibold truncate flex items-center gap-2">
                                        {driver.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                        {stats.active > 0 ? (
                                            <span className="text-blue-600 font-medium flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                {stats.active} Active
                                            </span>
                                        ) : (
                                            <span className="opacity-70">No active</span>
                                        )}
                                        {stats.missingGps > 0 && (
                                            <>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-orange-600 font-bold flex items-center gap-1 bg-orange-50 px-1 rounded-sm" title={`${stats.missingGps} orders hidden from map (No GPS)`}>
                                                    <MapPinOff size={10} />
                                                    {stats.missingGps} No GPS
                                                </span>
                                            </>
                                        )}
                                        <span className="text-slate-300">•</span>
                                        <span className="text-green-600/80 flex items-center gap-1">
                                            <CheckCircle2 size={10} />
                                            {stats.completed} Done
                                        </span>
                                    </div>
                                </div>
                            </Button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
