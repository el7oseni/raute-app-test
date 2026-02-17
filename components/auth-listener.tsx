"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/toast-provider'
import { restoreCodeVerifier, clearCodeVerifierBackup } from '@/lib/pkce-backup'
import { capacitorStorage } from '@/lib/capacitor-storage'

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

        // Use refreshSession instead of setSession — more reliable when access_token is expired
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: backup.refresh_token
        })

        if (error) {
            console.error('❌ Backup session restore failed:', error.message)
            // Fallback: try setSession in case refreshSession doesn't work
            const { data: fallbackData, error: fallbackError } = await supabase.auth.setSession({
                access_token: backup.access_token,
                refresh_token: backup.refresh_token
            })
            if (fallbackError || !fallbackData.session) {
                console.error('❌ Fallback setSession also failed')
                await Preferences.remove({ key: SESSION_BACKUP_KEY })
                return false
            }
            console.log('✅ Session restored via fallback setSession!')
            await backupSession(fallbackData.session.access_token, fallbackData.session.refresh_token)
            return true
        }

        if (data.session) {
            console.log('✅ Session restored from backup via refreshSession!')
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
    const { toast } = useToast()
    const router = useRouter()

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

        // Helper: verify session is persisted, then hard-navigate to dashboard
        // Uses window.location.href (NOT router.push) to force a full page reload.
        // This ensures auth-check starts fresh with the session already in storage.
        async function waitForSessionAndNavigate() {
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 400))
                const { data } = await supabase.auth.getSession()
                if (data.session) {
                    console.log(`✅ Session verified on check ${i + 1}, navigating to dashboard`)
                    toast({
                        title: 'Welcome Back!',
                        description: 'Successfully logged in.',
                        type: 'success'
                    })
                    window.location.href = '/dashboard'
                    return true
                }
            }
            console.error('❌ Session not found after 5 verification checks')
            return false
        }

        // Listen for deep links (e.g. io.raute.app://auth/callback?code=...)
        const listener = App.addListener('appUrlOpen', async ({ url }) => {
            console.log('🔗 Deep link received:', url)

            // Debug: show that deep link was received (visible to user)
            toast({
                title: 'Deep Link Received',
                description: url.substring(0, 80),
                type: 'info'
            })

            if (url.includes('auth/callback')) {
                try {
                    await Browser.close()
                } catch (e) {}

                await new Promise(resolve => setTimeout(resolve, 500))

                const parsedUrl = new URL(url)
                const hashParams = new URLSearchParams(url.split('#')[1] || '')

                // Check both query params AND hash fragment (iOS may use either)
                const code = parsedUrl.searchParams.get('code')
                const error = parsedUrl.searchParams.get('error') || hashParams.get('error')
                const errorDescription = parsedUrl.searchParams.get('error_description') || hashParams.get('error_description')
                const accessToken = hashParams.get('access_token') || parsedUrl.searchParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token') || parsedUrl.searchParams.get('refresh_token')

                console.log('🔗 Parsed callback:', { hasCode: !!code, hasAccessToken: !!accessToken, hasError: !!error })

                if (error) {
                    // Clear stale auth data on OAuth error to prevent poisoning
                    console.log('🧹 OAuth error received, clearing auth data...')
                    await supabase.auth.signOut({ scope: 'local' })
                    await capacitorStorage.clearAllAuthData()

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

                    let lastError = ''

                    // Check if code verifier exists before attempting exchange
                    try {
                        const verifier = await capacitorStorage.getItem('sb-raute-auth-code-verifier')
                        toast({
                            title: 'PKCE Debug',
                            description: `Code verifier: ${verifier ? 'EXISTS' : 'MISSING'}`,
                            type: verifier ? 'info' : 'error'
                        })
                    } catch {}

                    // Helper: navigate to dashboard with full page reload
                    // Using window.location.href instead of router.push to ensure
                    // auth-check starts completely fresh with the session already in storage
                    const navigateToDashboard = () => {
                        toast({ title: 'Welcome Back!', description: 'Successfully logged in.', type: 'success' })
                        window.location.href = '/dashboard'
                    }

                    // Attempt 1: Direct code exchange
                    try {
                        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
                        if (!sessionError && data.session) {
                            console.log('✅ Session via PKCE exchange (attempt 1)')
                            await backupSession(data.session.access_token, data.session.refresh_token)
                            await clearCodeVerifierBackup()
                            // Wait for session to be fully persisted before navigating
                            await new Promise(resolve => setTimeout(resolve, 500))
                            navigateToDashboard()
                            return
                        }
                        lastError = sessionError?.message || 'Unknown error'
                        console.warn('⚠️ Exchange attempt 1 failed:', lastError)
                        toast({ title: 'Exchange 1 Failed', description: lastError, type: 'error' })
                    } catch (err: any) {
                        lastError = err?.message || 'Exception'
                        console.error('❌ Exchange attempt 1 exception:', lastError)
                        toast({ title: 'Exchange 1 Error', description: lastError, type: 'error' })
                    }

                    // Attempt 2: Restore code verifier from backup, then retry
                    console.log('🔄 Restoring code verifier from backup...')
                    const restored = await restoreCodeVerifier()
                    if (restored) {
                        await new Promise(resolve => setTimeout(resolve, 300))
                        try {
                            const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
                            if (!sessionError && data.session) {
                                console.log('✅ Session via PKCE exchange (attempt 2 - restored verifier)')
                                await backupSession(data.session.access_token, data.session.refresh_token)
                                await clearCodeVerifierBackup()
                                await new Promise(resolve => setTimeout(resolve, 500))
                                navigateToDashboard()
                                return
                            }
                            lastError = sessionError?.message || 'Unknown error'
                            console.warn('⚠️ Exchange attempt 2 failed:', lastError)
                        } catch (err: any) {
                            lastError = err?.message || 'Exception'
                            console.error('❌ Exchange attempt 2 exception:', lastError)
                        }
                    }

                    // Attempt 3: Check if session was set by onAuthStateChange
                    console.log('🔄 Checking for existing session...')
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    const { data: sessionData } = await supabase.auth.getSession()
                    if (sessionData.session) {
                        await backupSession(sessionData.session.access_token, sessionData.session.refresh_token)
                        await clearCodeVerifierBackup()
                        navigateToDashboard()
                        return
                    }

                    // All attempts failed — clear ALL auth data to prevent poisoning
                    // subsequent login attempts (including email/password)
                    console.log('🧹 PKCE exchange failed, clearing all auth data to prevent poisoning...')
                    await supabase.auth.signOut({ scope: 'local' })
                    await capacitorStorage.clearAllAuthData()

                    toast({
                        title: 'Login Failed',
                        description: `Error: ${lastError}`,
                        type: 'error'
                    })
                    return
                }

                // Implicit flow tokens (from hash fragment)
                if (accessToken && refreshToken) {
                    console.log('🔐 Setting session from hash tokens...')
                    const { data: tokenData, error: setError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (!setError && tokenData.session) {
                        await backupSession(tokenData.session.access_token, tokenData.session.refresh_token)
                        toast({
                            title: 'Welcome Back!',
                            description: 'Successfully logged in.',
                            type: 'success'
                        })
                        window.location.href = '/dashboard'
                    } else {
                        console.error('❌ setSession failed:', setError?.message)
                        toast({
                            title: 'Login Failed',
                            description: setError?.message || 'Could not complete sign in.',
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
    }, [toast, router])

    return null
}
