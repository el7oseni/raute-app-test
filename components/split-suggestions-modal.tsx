'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { SplitSuggestion } from '@/lib/split-calculator'

interface SplitSuggestionsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    suggestions: SplitSuggestion[]
    onConfirm: () => void
}

export function SplitSuggestionsModal({ open, onOpenChange, suggestions, onConfirm }: SplitSuggestionsModalProps) {
    const movesRequired = suggestions.reduce((acc, curr) => acc + (curr.action !== 'keep' ? 1 : 0), 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Optimization Suggestions</DialogTitle>
                    <DialogDescription>
                        We analyzed your workload. Here is how we recommend splitting orders for maximum fairness.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {movesRequired === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-green-50 text-green-800 rounded-lg">
                            <CheckCircle2 size={32} className="mb-2" />
                            <p className="font-semibold">Workload is already perfectly balanced!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {suggestions.map((s) => (
                                <div key={s.driverId} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${s.action === 'add' ? 'bg-green-500' : s.action === 'remove' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                                        <span className="font-medium text-sm">{s.driverName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-muted-foreground">{s.currentCount} orders</span>
                                        <ArrowRight size={14} className="text-muted-foreground" />
                                        <span className={`font-bold ${s.action === 'add' ? 'text-green-600' : s.action === 'remove' ? 'text-orange-600' : ''}`}>
                                            {s.suggestedCount}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {movesRequired > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 text-xs rounded-md">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p>Applying optimization will re-assign unlocked orders to match these targets while minimizing travel distance.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => { onConfirm(); onOpenChange(false); }}>
                        Apply Optimization
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
