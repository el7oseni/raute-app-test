
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ChevronRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function SetupGuide({ hasDrivers, hasOrders, hasHubs, hasOptimizedOrders }: { hasDrivers: boolean, hasOrders: boolean, hasHubs: boolean, hasOptimizedOrders?: boolean }) {
    const router = useRouter()
    const [isVisible, setIsVisible] = useState(true)

    // Hide if all steps are complete
    if (hasHubs && hasDrivers && hasOrders && hasOptimizedOrders) return null

    // Hide if user dismissed it
    if (!isVisible) return null

    const steps = [
        {
            id: 1,
            title: 'Set up Warehouses',
            description: 'Define your start locations (Hubs).',
            action: 'Add Hub',
            route: '/settings',
            isComplete: hasHubs
        },
        {
            id: 2,
            title: 'Add your first Driver',
            description: 'Create accounts for your team members.',
            action: 'Add Driver',
            route: '/drivers',
            isComplete: hasDrivers
        },
        {
            id: 3,
            title: 'Create your first Order',
            description: 'Add delivery details manually or via Excel.',
            action: 'Add Order',
            route: '/orders',
            isComplete: hasOrders
        },
        {
            id: 4,
            title: 'Optimize Routes',
            description: 'Go to the Planner to assign orders automatically.',
            action: 'Go to Planner',
            route: '/planner',
            isComplete: hasOptimizedOrders || false // Complete if we have orders assigned to drivers
        }
    ]

    return (
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-xl overflow-hidden relative mb-6">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex-1 space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Setup Guide
                        </div>
                        <h2 className="text-xl font-bold">Welcome to Raute! 🚀</h2>
                        <p className="text-slate-300 text-sm max-w-md">
                            Follow these steps to get your fleet running. We'll guide you through setting up drivers, orders, and planning your first route.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[300px]">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${step.isComplete
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {step.isComplete ? (
                                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-black">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    ) : (
                                        <div className="h-6 w-6 rounded-full border-2 border-slate-500 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {step.id}
                                        </div>
                                    )}
                                    <div>
                                        <p className={`text-sm font-medium ${step.isComplete ? 'text-green-300' : 'text-white'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 hidden sm:block">{step.description}</p>
                                    </div>
                                </div>

                                {!step.isComplete && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 text-xs bg-white text-black hover:bg-slate-200"
                                        onClick={() => router.push(step.route)}
                                    >
                                        {step.action} <ChevronRight size={12} className="ml-1" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
