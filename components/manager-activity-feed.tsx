
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { Clock, Truck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DateRange } from "react-day-picker"

type LogWithDriver = {
    id: string
    status: string
    timestamp: string
    driver: {
        name: string
    }
}

interface ManagerActivityFeedProps {
    dateRange?: DateRange
}

export function ManagerActivityFeed({ dateRange }: ManagerActivityFeedProps) {
    const [logs, setLogs] = useState<LogWithDriver[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchLogs()
    }, [dateRange])

    async function fetchLogs() {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Build the query with optional date filter
            let query = supabase
                .from('driver_activity_logs')
                .select(`
                    id,
                    status,
                    timestamp,
                    driver:drivers(name)
                `)
                .order('timestamp', { ascending: false })
                .limit(50)

            // Apply date range filter (date only — same behavior as Orders)
            if (dateRange?.from) {
                const start = startOfDay(dateRange.from)
                const end = endOfDay(dateRange.to || dateRange.from)
                query = query
                    .gte('timestamp', start.toISOString())
                    .lte('timestamp', end.toISOString())
            }

            const { data, error } = await query

            if (error) throw error
            setLogs(data as any || [])
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>

    if (logs.length === 0) return <div className="text-center text-sm text-slate-400 py-6">No driver activity for this period.</div>

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 items-start">
                    <div className={`mt-0.5
                        relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0
                        ${log.status === 'online' ? 'bg-green-100 border-green-200 text-green-600' :
                            log.status === 'offline' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-100 border-blue-200 text-blue-600'}
                    `}>
                        <Truck size={14} />
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-none truncate">
                            {log.driver?.name || 'Unknown Driver'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {log.status === 'online' ? 'started shift' : log.status === 'offline' ? 'ended shift' : 'is working'}
                        </p>
                    </div>

                    <div className="ml-auto text-right shrink-0">
                        <p className="text-[11px] text-slate-500 font-medium">
                            {format(new Date(log.timestamp), 'MMM dd')}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                            {format(new Date(log.timestamp), 'hh:mm a')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
