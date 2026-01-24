"use client"

import { useEffect, useState } from "react"
import { geoService } from "@/lib/geo-service"

export function DebugLocationStatus() {
    const [status, setStatus] = useState<any>({ lastStatus: 'idle' })
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            // Poll the singleton service state
            setStatus({ ...geoService.debugState })
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-20 left-4 z-[9999] bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full shadow-lg font-bold animate-pulse"
            >
                Debug GPS
            </button>
        )
    }

    return (
        <div className="fixed bottom-20 left-4 z-[9999] bg-black/90 text-white p-3 rounded-lg shadow-xl text-xs w-[220px] overflow-hidden font-mono border border-slate-700">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                <span className="font-bold text-yellow-400">GPS DIAGNOSTICS</span>
                <button onClick={() => setIsVisible(false)} className="text-slate-400 hover:text-white px-2">X</button>
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span className="text-slate-400">Driver ID:</span>
                    <span className="text-blue-300 max-w-[80px] truncate">{status.driverId || "None"}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-400">Sync Status:</span>
                    <span className={`font-bold ${status.lastStatus === 'success' ? "text-green-400" : status.lastStatus === 'error' ? "text-red-500" : "text-yellow-500"}`}>
                        {status.lastStatus?.toUpperCase() || "IDLE"}
                    </span>
                </div>

                {status.lastLocation && (
                    <div className="bg-slate-800 p-1 rounded text-[10px] text-center">
                        LAT: <span className="text-green-300">{status.lastLocation.lat?.toFixed(5)}</span><br />
                        LNG: <span className="text-green-300">{status.lastLocation.lng?.toFixed(5)}</span>
                    </div>
                )}

                {status.lastError && (
                    <div className="text-[10px] bg-red-900/50 text-red-200 p-1 rounded border border-red-800 break-words">
                        Err: {status.lastError}
                    </div>
                )}

                <div className="text-[9px] text-slate-500 text-right">
                    Last Try: {status.lastAttempt ? new Date(status.lastAttempt).toLocaleTimeString() : 'Never'}
                </div>

                <div className="text-[9px] text-slate-500 mt-2 italic border-t border-slate-700 pt-1">
                    Ensure Location Access is ALLOWED.
                </div>
            </div>
        </div>
    )
}
