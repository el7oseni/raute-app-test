
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ChevronRight, X, Power, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function DriverSetupGuide({
    isOnline,
    hasTasks,
    onToggleOnline,
    onViewAssignments,
    forceShow = false,
    onDismiss
}: {
    isOnline: boolean,
    hasTasks: boolean,
    onToggleOnline: () => void,
    onViewAssignments: () => void,
    forceShow?: boolean,
    onDismiss?: () => void
}) {
    const [isVisible, setIsVisible] = useState(true)

    // Handle external dismiss
    const handleDismiss = () => {
        setIsVisible(false)
        if (onDismiss) onDismiss()
    }

    // Determine visibility logic
    if (forceShow) {
        // Show regardless of status
    } else {
        // Hide if completed
        if (isOnline && hasTasks) return null
        // Hide if manually dismissed
        if (!isVisible) return null
    }

    const steps = [
        {
            id: 1,
            title: 'Go Online',
            description: 'Toggle your status to receive orders.',
            action: 'Toggle Status',
            onClick: onToggleOnline,
            isComplete: isOnline,
            icon: Power
        },
        {
            id: 2,
            title: 'View Assignments',
            description: 'Check your active delivery tasks.',
            action: 'View Tasks',
            onClick: onViewAssignments,
            isComplete: hasTasks,
            icon: MapPin
        }
    ]

    return (
        <Card className="bg-slate-900 dark:bg-slate-800 text-white border-0 shadow-xl overflow-hidden relative mb-6">
            <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss guide"
            >
                <X size={20} />
            </button>
            <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-[10px] font-bold border border-green-500/30 uppercase tracking-wider">
                            Getting Started
                        </div>
                        <h2 className="text-lg font-bold">Driver Checklist ✅</h2>
                        <p className="text-slate-300 text-xs">
                            Complete these steps to start your delivery shift.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                onClick={step.onClick}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer active:scale-95 hover:bg-white/10 ${step.isComplete
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-white/5 border-white/10'
                                    }`}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${step.isComplete ? 'bg-green-500 text-black' : 'bg-slate-700 text-slate-400'
                                        }`}>
                                        {step.isComplete ? <CheckCircle2 size={16} /> : <step.icon size={16} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${step.isComplete ? 'text-green-300' : 'text-white'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 leading-tight">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
