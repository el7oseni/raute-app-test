'use client'
import { useEffect, useState } from 'react'

export function MobileAuthWrapper({
    children,
    mobileChildren
}: {
    children: React.ReactNode
    mobileChildren: React.ReactNode
}) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Detect if running in Capacitor (mobile app)
        const checkMobile = async () => {
            if (typeof window !== 'undefined' && (window as any).Capacitor) {
                // Check if it's actually native platform (iOS/Android) not just web with Capacitor injected
                const isNative = (window as any).Capacitor.isNativePlatform?.() ||
                    (window as any).Capacitor.getPlatform?.() !== 'web';

                if (isNative) {
                    setIsMobile(true)
                }
            }
        }
        checkMobile()
    }, [])

    // Show mobile version for Capacitor, web version otherwise
    return isMobile ? <>{mobileChildren}</> : <>{children}</>
}
