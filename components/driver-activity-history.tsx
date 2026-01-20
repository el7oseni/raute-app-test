
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { Activity, Clock } from 'lucide-react'

export function DriverActivityHistory({ driverId }: { driverId: string | null }) {
    const [logs, setLogs] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (driverId) fetchLogs()
    }, [driverId])

    async function fetchLogs() {
        try {
            const { data, error } = await supabase
                .from('driver_activity_logs')
                .select('*')
                .eq('driver_id', driverId)
                .order('timestamp', { ascending: false })
                .limit(50)

            if (error) {
                console.error('Failed to fetch driver activity logs:', error.message, error)
                throw error
            }
            setLogs(data || [])
        } catch (err: any) {
            console.error('Driver Activity Logs Error:', err?.message || err)
            // Set empty logs on error to show "No activity" message
            setLogs([])
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>

    if (logs.length === 0) return <div className="text-center text-sm text-slate-400 py-6">No activity recorded yet.</div>

    return (
        <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4"> // timeline container
                {logs.map((log, i) => (
                    <div key={log.id} className="flex gap-3 relative pb-6 last:pb-0">
                        {/* Timeline Line */}
                        {i !== logs.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                        )}

                        <div className={`
                            relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 
                            ${log.status === 'online' ? 'bg-green-100 border-green-200 text-green-600' :
                                log.status === 'offline' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-100 border-blue-200 text-blue-600'}
                        `}>
                            <div className={`w-2 h-2 rounded-full ${log.status === 'online' ? 'bg-green-500' : log.status === 'offline' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                        </div>

                        <div>
                            <p className="text-sm font-medium leading-none">
                                {log.status === 'online' ? 'Started Shift' : log.status === 'offline' ? 'Ended Shift' : 'Working'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Clock size={10} />
                                {format(new Date(log.timestamp), 'MMM dd, h:mm a')}
                            </p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1 font-mono bg-slate-50 inline-block px-1 rounded">
                                    {JSON.stringify(log.metadata)}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}
