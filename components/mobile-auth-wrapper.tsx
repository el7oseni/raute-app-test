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
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
            setIsMobile(true)
        }
    }, [])

    // Show mobile version for Capacitor, web version otherwise
    return isMobile ? <>{mobileChildren}</> : <>{children}</>
}
