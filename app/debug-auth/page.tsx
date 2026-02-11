'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugAuthPage() {
    const [debug, setDebug] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function runDiagnostics() {
            const results: Record<string, any> = {}

            // 1. Check session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            results['1_session'] = {
                hasSession: !!sessionData?.session,
                userId: sessionData?.session?.user?.id || 'NONE',
                email: sessionData?.session?.user?.email || 'NONE',
                provider: sessionData?.session?.user?.app_metadata?.provider || 'NONE',
                error: sessionError?.message || null
            }

            // 2. Check getUser
            const { data: userData, error: userError } = await supabase.auth.getUser()
            results['2_getUser'] = {
                hasUser: !!userData?.user,
                userId: userData?.user?.id || 'NONE',
                email: userData?.user?.email || 'NONE',
                error: userError?.message || null
            }

            // 3. Try querying public.users
            if (sessionData?.session?.user?.id) {
                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('id, email, role, company_id, full_name')
                    .eq('id', sessionData.session.user.id)
                    .single()

                results['3_profile_query'] = {
                    hasData: !!profileData,
                    data: profileData || 'NULL',
                    error: profileError?.message || null,
                    errorCode: profileError?.code || null,
                    errorDetails: profileError?.details || null,
                    errorHint: profileError?.hint || null
                }

                // 4. Try querying WITHOUT eq filter (to see if RLS blocks all)
                const { data: allUsers, error: allUsersError } = await supabase
                    .from('users')
                    .select('id, email, role')
                    .limit(5)

                results['4_all_users_query'] = {
                    count: allUsers?.length || 0,
                    data: allUsers || 'NULL',
                    error: allUsersError?.message || null
                }
            }

            // 5. Check localStorage for session tokens
            if (typeof window !== 'undefined') {
                const keys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
                results['5_storage'] = {
                    keys: keys,
                    keyCount: keys.length
                }
            }

            setDebug(results)
            setLoading(false)
        }

        runDiagnostics()
    }, [])

    if (loading) {
        return (
            <div className="p-8 font-mono text-sm">
                <h1 className="text-2xl font-bold mb-4">🔍 Auth Diagnostics</h1>
                <p>Running diagnostics...</p>
            </div>
        )
    }

    return (
        <div className="p-8 font-mono text-sm max-w-4xl mx-auto safe-area-pt">
            <h1 className="text-2xl font-bold mb-4">🔍 Auth & RLS Diagnostics</h1>
            <p className="text-slate-500 mb-6">This page checks if your auth session works with database queries</p>
            
            {Object.entries(debug).map(([key, value]) => (
                <div key={key} className="mb-6 border rounded-lg p-4 bg-white dark:bg-slate-900">
                    <h2 className="font-bold text-lg mb-2 text-blue-600">{key}</h2>
                    <pre className="whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-800 p-3 rounded text-xs">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                </div>
            ))}

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800">📋 Copy & send to developer:</h3>
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(debug, null, 2))
                        alert('Copied to clipboard!')
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Copy All Results
                </button>
            </div>
        </div>
    )
}
