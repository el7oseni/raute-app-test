'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Loader2 } from 'lucide-react'

interface PullToRefreshProps {
    onRefresh: () => Promise<void>
    children: ReactNode
    threshold?: number // Distance to trigger refresh (px)
}

export function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
    const [pulling, setPulling] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)

    const startY = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Only enable on native mobile
    const isNative = Capacitor.isNativePlatform()

    useEffect(() => {
        if (!isNative) return // Skip on web

        const container = containerRef.current
        if (!container) return

        const handleTouchStart = (e: TouchEvent) => {
            // Only trigger if user is at top of scroll
            if (container.scrollTop === 0) {
                startY.current = e.touches[0].clientY
                setPulling(true)
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!pulling || refreshing) return

            const currentY = e.touches[0].clientY
            const distance = currentY - startY.current

            // Only pull down
            if (distance > 0 && container.scrollTop === 0) {
                e.preventDefault() // Prevent scroll while pulling
                setPullDistance(Math.min(distance, threshold * 1.5))

                // Haptic feedback at threshold
                if (distance >= threshold) {
                    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { })
                }
            }
        }

        const handleTouchEnd = async () => {
            if (!pulling) return

            setPulling(false)

            // Trigger refresh if threshold reached
            if (pullDistance >= threshold && !refreshing) {
                setRefreshing(true)
                await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => { })

                try {
                    await onRefresh()
                } catch (error) {
                    console.error('Refresh failed:', error)
                } finally {
                    setRefreshing(false)
                    setPullDistance(0)
                }
            } else {
                // Reset without refreshing
                setPullDistance(0)
            }
        }

        container.addEventListener('touchstart', handleTouchStart, { passive: true })
        container.addEventListener('touchmove', handleTouchMove, { passive: false })
        container.addEventListener('touchend', handleTouchEnd)

        return () => {
            container.removeEventListener('touchstart', handleTouchStart)
            container.removeEventListener('touchmove', handleTouchMove)
            container.removeEventListener('touchend', handleTouchEnd)
        }
    }, [pulling, pullDistance, threshold, refreshing, onRefresh, isNative])

    // Calculate progress for animation
    const progress = Math.min(pullDistance / threshold, 1)
    const rotation = progress * 360

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
        >
            {/* Pull Indicator - Only show on native */}
            {isNative && (
                <div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out pointer-events-none z-50"
                    style={{
                        height: `${Math.min(pullDistance, threshold)}px`,
                        opacity: progress,
                    }}
                >
                    <div className="bg-background/95 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border">
                        <Loader2
                            className="text-primary"
                            size={24}
                            style={{
                                transform: refreshing ? undefined : `rotate(${rotation}deg)`,
                                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            }}
                        />
                    </div>
                    {!refreshing && progress >= 1 && (
                        <p className="absolute bottom-0 text-xs text-primary font-bold">Release to refresh</p>
                    )}
                </div>
            )}

            {/* Content with padding to prevent overlap */}
            <div style={{ paddingTop: refreshing ? '60px' : undefined }}>
                {children}
            </div>
        </div>
    )
}
