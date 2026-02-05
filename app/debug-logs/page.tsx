'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function DebugLogsPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [session, setSession] = useState<any>(null)
    const [storage, setStorage] = useState<any>(null)

    useEffect(() => {
        checkEverything()
    }, [])

    const checkEverything = async () => {
        const newLogs: string[] = []
        
        try {
            // 1. Check Supabase Session
            const supabase = createClient()
            const { data: { session: currentSession }, error } = await supabase.auth.getSession()
            
            newLogs.push(`📱 Platform: ${typeof window !== 'undefined' ? 'Mobile/Web' : 'Server'}`)
            newLogs.push(`🔑 Session exists: ${!!currentSession}`)
            
            if (error) {
                newLogs.push(`❌ Session Error: ${error.message}`)
            }
            
            if (currentSession) {
                newLogs.push(`✅ User ID: ${currentSession.user.id}`)
                newLogs.push(`📧 Email: ${currentSession.user.email}`)
                newLogs.push(`✓ Email verified: ${!!currentSession.user.email_confirmed_at}`)
                newLogs.push(`🕐 Session expires: ${new Date(currentSession.expires_at! * 1000).toLocaleString()}`)
                setSession(currentSession)
            } else {
                newLogs.push(`⚠️ No session found`)
            }

            // 2. Check Local Storage (if web)
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    const keys = Object.keys(localStorage)
                    newLogs.push(`\n💾 LocalStorage Keys (${keys.length}):`)
                    keys.forEach(key => {
                        if (key.includes('supabase') || key.includes('auth')) {
                            const value = localStorage.getItem(key)
                            newLogs.push(`  - ${key}: ${value?.substring(0, 50)}...`)
                        }
                    })
                } catch (e) {
                    newLogs.push(`❌ LocalStorage Error: ${e}`)
                }
            }

            // 3. Check Capacitor Storage (if mobile)
            if (typeof window !== 'undefined') {
                try {
                    const { Capacitor } = await import('@capacitor/core')
                    const { Preferences } = await import('@capacitor/preferences')
                    
                    newLogs.push(`\n📱 Capacitor Platform: ${Capacitor.getPlatform()}`)
                    newLogs.push(`📱 Is Native: ${Capacitor.isNativePlatform()}`)
                    
                    // Try to get Supabase data from Capacitor Preferences
                    const { value } = await Preferences.get({ key: 'supabase.auth.token' })
                    newLogs.push(`💾 Capacitor Preferences token: ${value ? 'EXISTS' : 'NOT FOUND'}`)
                    
                    if (value) {
                        newLogs.push(`  Token length: ${value.length} chars`)
                        setStorage(value.substring(0, 100))
                    }
                } catch (e) {
                    newLogs.push(`⚠️ Capacitor not available or error: ${e}`)
                }
            }

            // 4. Test database access
            try {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, email, role, company_id')
                    .limit(1)
                    .single()

                if (userError) {
                    newLogs.push(`\n❌ Database Error: ${userError.message}`)
                } else if (userData) {
                    newLogs.push(`\n✅ Database Access: SUCCESS`)
                    newLogs.push(`  User role: ${userData.role}`)
                    newLogs.push(`  Company ID: ${userData.company_id}`)
                } else {
                    newLogs.push(`\n⚠️ No user data found in database`)
                }
            } catch (e) {
                newLogs.push(`\n❌ Database query failed: ${e}`)
            }

        } catch (error: any) {
            newLogs.push(`❌ Fatal Error: ${error.message}`)
        }

        setLogs(newLogs)
    }

    const clearStorageAndReload = async () => {
        try {
            // Clear localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.clear()
            }

            // Clear Capacitor Preferences
            const { Preferences } = await import('@capacitor/preferences')
            await Preferences.clear()

            alert('Storage cleared! Reloading...')
            window.location.href = '/login'
        } catch (e) {
            alert(`Error clearing storage: ${e}`)
        }
    }

    const testLogin = async () => {
        const email = prompt('Enter email:')
        const password = prompt('Enter password:')

        if (!email || !password) return

        try {
            const supabase = createClient()
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                alert(`Login failed: ${error.message}`)
            } else {
                alert('Login successful! Checking session...')
                await checkEverything()
            }
        } catch (e: any) {
            alert(`Login error: ${e.message}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">🔍 Debug Logs</h1>
                
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={checkEverything}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={testLogin}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                        🔐 Test Login
                    </button>
                    <button
                        onClick={clearStorageAndReload}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        🗑️ Clear Storage & Reload
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-4 mb-4">
                    <h2 className="font-bold mb-2">Diagnostic Logs:</h2>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                        {logs.join('\n')}
                    </pre>
                </div>

                {session && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h2 className="font-bold text-green-800 mb-2">✅ Session Data:</h2>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </div>
                )}

                {storage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h2 className="font-bold text-blue-800 mb-2">💾 Storage Sample:</h2>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                            {storage}...
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
