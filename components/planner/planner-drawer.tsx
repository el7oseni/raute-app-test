import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { Sparkles, Package, Truck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type Order, type Driver } from "@/lib/supabase"
import { isDriverOnline } from "@/lib/driver-status"

interface PlannerDrawerProps {
    orders: Order[]
    drivers: Driver[]
    unassignedOrders: Order[]
    onOptimize: () => void
    strategy: string
    setStrategy: (s: string) => void
    selectedDriverIds: string[]
    toggleDriver: (id: string) => void
    toggleAllDrivers: () => void
}

export function PlannerDrawer({
    orders,
    drivers,
    unassignedOrders,
    onOptimize,
    strategy,
    setStrategy,
    selectedDriverIds,
    toggleDriver,
    toggleAllDrivers
}: PlannerDrawerProps) {
    const [isOpen, setIsOpen] = useState<'COLLAPSED' | 'EXPANDED' | 'FULL'>('COLLAPSED')
    const controls = useAnimation()
    
    // Initial animation
    useEffect(() => {
        // Just set initial height based on state
    }, [])

    const toggleState = () => {
        if (isOpen === 'COLLAPSED') setIsOpen('EXPANDED')
        else if (isOpen === 'EXPANDED') setIsOpen('FULL')
        else setIsOpen('COLLAPSED')
    }

    // Dynamic height style
    const getHeight = () => {
        switch (isOpen) {
            case 'COLLAPSED': return '100px'
            case 'EXPANDED': return '50%'
            case 'FULL': return '92%'
            default: return '100px'
        }
    }

    return (
        <motion.div
            initial={{ height: '100px' }}
            animate={{ height: getHeight() }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[500] flex flex-col md:hidden overflow-hidden"
        >
            {/* DRAG HANDLE / HEADER */}
            <div 
                onClick={toggleState}
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer bg-background z-10 shrink-0 border-b border-border/50"
            >
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mb-2" />
                
                {/* SUMMARY HEADER (Always Visible) */}
                <div className="w-full px-6 flex items-center justify-between pb-2">
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Unassigned</span>
                            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                <Package size={16} />
                                <span className="text-lg font-bold">{unassignedOrders.length}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Drivers</span>
                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                <Truck size={16} />
                                <span className="text-lg font-bold">{selectedDriverIds.length}/{drivers.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* FAB (Inside Drawer Header) */}
                    <Button 
                        onClick={(e) => {
                            e.stopPropagation()
                            onOptimize()
                        }}
                        size="sm"
                        className="h-10 rounded-full shadow-md bg-primary hover:bg-primary/90 px-4 font-semibold text-xs transition-transform active:scale-95"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Optimize
                    </Button>
                </div>
            </div>

            {/* EXPANDED CONTENT SCROLL AREA */}
            <div className="flex-1 overflow-y-auto bg-background/50 safe-area-pb">
                <div className="p-5 space-y-6">
                    
                    {/* 1. STRATEGY SELECTOR */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Optimization Strategy</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {['fastest', 'balanced', 'efficient'].map((s) => (
                                <div 
                                    key={s}
                                    onClick={() => setStrategy(s)}
                                    className={`
                                        cursor-pointer text-center py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all
                                        ${strategy === s 
                                            ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                                            : 'bg-card border-border text-muted-foreground hover:bg-muted'}
                                    `}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. DRIVER SELECTION */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drivers ({drivers.length})</h3>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={toggleAllDrivers}
                                className="h-6 text-[10px] px-2"
                            >
                                {selectedDriverIds.length === drivers.length ? 'None' : 'All'}
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            {drivers.map(driver => {
                                const isSelected = selectedDriverIds.includes(driver.id)
                                return (
                                    <div 
                                        key={driver.id}
                                        onClick={() => toggleDriver(driver.id)}
                                        className={`
                                            flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99]
                                            ${isSelected
                                                ? 'bg-primary/5 border-primary/30 shadow-sm'
                                                : 'bg-card border-border opacity-80'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    <Truck size={14} />
                                                </div>
                                                <div className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${isDriverOnline(driver) ? 'bg-green-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{driver.name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {isDriverOnline(driver) ? 'Online' : 'Offline'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className={`
                                            h-5 w-5 rounded-full border flex items-center justify-center transition-colors
                                            ${isSelected ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground/30'}
                                        `}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>
                                )
                            })}
                            {drivers.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed">
                                    No drivers available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. UNASSIGNED ORDERS PREVIEW */}
                    <div className="pt-2">
                         <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Unassigned Orders
                            </h3>
                            <Badge variant="secondary" className="text-[10px]">{unassignedOrders.length}</Badge>
                         </div>
                         
                         <div className="space-y-2">
                             {unassignedOrders.map(order => (
                                 <div key={order.id} className="p-3 bg-card border border-border rounded-xl shadow-sm flex justify-between items-center">
                                     <div className="flex items-center gap-3">
                                         <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center shrink-0">
                                            <Package size={14} />
                                         </div>
                                         <div className="min-w-0">
                                             <p className="text-xs font-bold truncate max-w-[180px]">{order.customer_name}</p>
                                             <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{order.address}</p>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {unassignedOrders.length === 0 && (
                                <div className="text-center py-4 text-green-600 text-sm font-medium">
                                    All orders assigned! 🎉
                                </div>
                             )}
                         </div>
                    </div>

                    {/* Spacer */}
                    <div className="h-20" />
                </div>
            </div>
        </motion.div>
    )
}
