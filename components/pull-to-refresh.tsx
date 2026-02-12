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

export function PullToRefresh({ onRefresh, children, threshold = 100 }: PullToRefreshProps) {
    const [refreshing, setRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)

    const startY = useRef(0)
    const isPulling = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)
    // Minimum distance before we consider it a pull gesture (dead zone)
    const DEAD_ZONE = 15

    // Only enable on native mobile
    const isNative = Capacitor.isNativePlatform()

    useEffect(() => {
        if (!isNative) return // Skip on web

        const container = containerRef.current
        if (!container) return

        const handleTouchStart = (e: TouchEvent) => {
            // Only init if we're at the very top of scroll AND not already refreshing
            if (container.scrollTop <= 0 && !refreshing) {
                startY.current = e.touches[0].clientY
                isPulling.current = false // Don't activate yet — wait for dead zone
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (refreshing) return
            // Must be at top of scroll
            if (container.scrollTop > 0) {
                isPulling.current = false
                setPullDistance(0)
                return
            }

            const currentY = e.touches[0].clientY
            const distance = currentY - startY.current

            // Only pull DOWN (positive distance)
            if (distance <= 0) {
                isPulling.current = false
                setPullDistance(0)
                return
            }

            // Dead zone — ignore small movements (this prevents accidental triggers)
            if (distance < DEAD_ZONE) {
                return
            }

            // Now we're actually pulling
            if (!isPulling.current) {
                isPulling.current = true
            }

            e.preventDefault() // Prevent native scroll while pulling
            // Apply rubber-band effect (diminishing returns)
            const adjustedDistance = distance - DEAD_ZONE
            const rubberBand = Math.min(adjustedDistance * 0.5, threshold * 1.2)
            setPullDistance(rubberBand)

            // Haptic feedback when reaching threshold
            if (rubberBand >= threshold && adjustedDistance < threshold + 5) {
                Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { })
            }
        }

        const handleTouchEnd = async () => {
            if (!isPulling.current || refreshing) {
                setPullDistance(0)
                isPulling.current = false
                return
            }

            isPulling.current = false

            // Trigger refresh only if pulled past threshold
            if (pullDistance >= threshold) {
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
                // Snap back
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
    }, [pullDistance, threshold, refreshing, onRefresh, isNative])

    // Progress for animation
    const progress = Math.min(pullDistance / threshold, 1)
    const rotation = progress * 360

    // On web, don't wrap in a scroll container
    if (!isNative) {
        return <>{children}</>
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-y-auto"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
            {/* Pull Indicator */}
            {(pullDistance > 0 || refreshing) && (
                <div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-150 ease-out pointer-events-none z-50"
                    style={{
                        height: `${refreshing ? 60 : Math.min(pullDistance, threshold)}px`,
                        opacity: refreshing ? 1 : progress,
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

            {/* Content */}
            <div style={{ paddingTop: refreshing ? '60px' : undefined }}>
                {children}
            </div>
        </div>
    )
}
