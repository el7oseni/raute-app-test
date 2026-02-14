"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/toast-provider'

const SESSION_BACKUP_KEY = 'raute-session-backup'

/**
 * Save session tokens to Preferences as a backup.
 * This is separate from Supabase's internal storage to ensure
 * session survives force-stop on iOS.
 */
async function backupSession(accessToken: string, refreshToken: string) {
    if (!Capacitor.isNativePlatform()) return
    try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.set({
            key: SESSION_BACKUP_KEY,
            value: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                saved_at: Date.now()
            })
        })
        console.log('💾 Session backed up to Preferences')
    } catch (err) {
        console.error('❌ Failed to backup session:', err)
    }
}

/**
 * Try to restore session from our backup when Supabase can't find its own.
 */
export async function restoreSessionFromBackup(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    try {
        const { Preferences } = await import('@capacitor/preferences')
        const { value } = await Preferences.get({ key: SESSION_BACKUP_KEY })
        if (!value) {
            console.log('📦 No session backup found')
            return false
        }

        const backup = JSON.parse(value)
        if (!backup.access_token || !backup.refresh_token) {
            console.log('📦 Invalid session backup data')
            return false
        }

        // Check if backup is too old (30 days)
        if (Date.now() - backup.saved_at > 30 * 24 * 60 * 60 * 1000) {
            console.log('📦 Session backup too old, clearing')
            await Preferences.remove({ key: SESSION_BACKUP_KEY })
            return false
        }

        console.log('📦 Restoring session from backup...')
        const { data, error } = await supabase.auth.setSession({
            access_token: backup.access_token,
            refresh_token: backup.refresh_token
        })

        if (error) {
            console.error('❌ Backup session restore failed:', error.message)
            // Clear invalid backup
            await Preferences.remove({ key: SESSION_BACKUP_KEY })
            return false
        }

        if (data.session) {
            console.log('✅ Session restored from backup!')
            // Re-backup with fresh tokens
            await backupSession(data.session.access_token, data.session.refresh_token)
            return true
        }

        return false
    } catch (err) {
        console.error('❌ Backup restore error:', err)
        return false
    }
}

/**
 * Clear the session backup (on explicit sign-out).
 */
async function clearSessionBackup() {
    if (!Capacitor.isNativePlatform()) return
    try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.remove({ key: SESSION_BACKUP_KEY })
        console.log('🗑️ Session backup cleared')
    } catch (err) {
        console.error('❌ Failed to clear session backup:', err)
    }
}

export function AuthListener() {
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        // Listen to ALL auth state changes to backup/clear session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔔 AuthListener event:', event, 'hasSession:', !!session)

            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
                // Backup session on every auth event
                await backupSession(session.access_token, session.refresh_token)
            } else if (event === 'SIGNED_OUT') {
                await clearSessionBackup()
            }
        })

        // Helper: verify session is persisted before navigating
        async function waitForSessionAndNavigate() {
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 300))
                const { data } = await supabase.auth.getSession()
                if (data.session) {
                    console.log(`✅ Session verified on check ${i + 1}, navigating to dashboard`)
                    toast({
                        title: 'Welcome Back!',
                        description: 'Successfully logged in.',
                        type: 'success'
                    })
                    router.push('/dashboard')
                    return true
                }
            }
            console.error('❌ Session not found after 5 verification checks')
            return false
        }

        // Listen for deep links (e.g. io.raute.app://auth/callback?code=...)
        const listener = App.addListener('appUrlOpen', async ({ url }) => {
            console.log('🔗 Deep link received:', url)

            if (url.includes('auth/callback')) {
                try {
                    await Browser.close()
                } catch (e) {}

                await new Promise(resolve => setTimeout(resolve, 500))

                const parsedUrl = new URL(url)
                const code = parsedUrl.searchParams.get('code')
                const error = parsedUrl.searchParams.get('error')
                const errorDescription = parsedUrl.searchParams.get('error_description')

                const hashParams = new URLSearchParams(url.split('#')[1] || '')
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')

                if (error) {
                    toast({
                        title: 'Login Error',
                        description: errorDescription || error,
                        type: 'error'
                    })
                    return
                }

                // PKCE code exchange
                if (code) {
                    console.log('🔐 Attempting PKCE code exchange...')
                    toast({
                        title: 'Verifying...',
                        description: 'Finalizing secure login',
                        type: 'info'
                    })

                    for (let attempt = 0; attempt < 3; attempt++) {
                        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

                        if (!sessionError && data.session) {
                            console.log('✅ Session established via PKCE code exchange')
                            // Explicitly backup the session
                            await backupSession(data.session.access_token, data.session.refresh_token)
                            await new Promise(resolve => setTimeout(resolve, 500))
                            const navigated = await waitForSessionAndNavigate()
                            if (!navigated) {
                                console.warn('⚠️ Session set but verification failed, navigating anyway')
                                toast({
                                    title: 'Welcome Back!',
                                    description: 'Successfully logged in.',
                                    type: 'success'
                                })
                                router.push('/dashboard')
                            }
                            return
                        }

                        console.warn(`⚠️ Code exchange attempt ${attempt + 1} failed:`, sessionError?.message)
                        if (attempt < 2) {
                            await new Promise(resolve => setTimeout(resolve, 500))
                        }
                    }

                    // Fallback
                    console.log('🔄 Code exchange failed, checking for existing session...')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    const { data: sessionData } = await supabase.auth.getSession()
                    if (sessionData.session) {
                        await backupSession(sessionData.session.access_token, sessionData.session.refresh_token)
                        await waitForSessionAndNavigate()
                        return
                    }

                    toast({
                        title: 'Login Failed',
                        description: 'Could not complete sign in. Please try again.',
                        type: 'error'
                    })
                    return
                }

                // Implicit flow tokens
                if (accessToken && refreshToken) {
                    console.log('🔐 Setting session from hash tokens...')
                    const { error: setError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (!setError) {
                        await backupSession(accessToken, refreshToken)
                        await new Promise(resolve => setTimeout(resolve, 500))
                        await waitForSessionAndNavigate()
                    } else {
                        toast({
                            title: 'Login Failed',
                            description: 'Could not complete sign in.',
                            type: 'error'
                        })
                    }
                    return
                }

                // No code or tokens — check session anyway
                console.log('🔄 No code or tokens in URL, checking for session...')
                await new Promise(resolve => setTimeout(resolve, 1000))
                const { data: fallbackSession } = await supabase.auth.getSession()
                if (fallbackSession.session) {
                    await waitForSessionAndNavigate()
                }
            }
        })

        // Listen for app state changes (resume/pause)
        const appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
                console.log('📱 App resumed')
                try {
                    const { data } = await supabase.auth.getSession()
                    if (data.session) {
                        await supabase.auth.refreshSession()
                        console.log('✅ Session refreshed on resume')
                    }
                } catch (err) {
                    console.warn('⚠️ Session refresh on resume failed (non-critical):', err)
                }
            }
        })

        return () => {
            subscription.unsubscribe()
            listener.then(handle => handle.remove())
            appStateListener.then(handle => handle.remove())
        }
    }, [router, toast])

    return null
}
