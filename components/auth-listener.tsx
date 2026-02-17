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
 * Global flag: true while OAuth PKCE exchange is in progress.
 * AuthCheck reads this to avoid redirecting to /login mid-exchange.
 */
export let oauthExchangeInProgress = false

/**
 * Guard against processing the same authorization code twice
 * (AppDelegate may fire the deep link event multiple times).
 */
let processingCode: string | null = null

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
                    // Guard: prevent processing the same code twice
                    if (processingCode === code) {
                        console.log('⚠️ Already processing this code, skipping duplicate')
                        return
                    }
                    processingCode = code
                    oauthExchangeInProgress = true

                    console.log('🔐 Attempting PKCE code exchange...')
                    toast({ title: 'Step 1/6', description: 'Starting PKCE exchange...', type: 'info' })

                    let lastError = ''

                    // Debug: Check if code verifier exists
                    try {
                        const verifier = await capacitorStorage.getItem('sb-raute-auth-code-verifier')
                        toast({ title: 'Step 2/6: Verifier', description: verifier ? 'EXISTS' : 'MISSING', type: verifier ? 'info' : 'error' })
                    } catch {}

                    // Attempt 1: Direct code exchange
                    try {
                        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
                        toast({ title: 'Step 3/6: Exchange', description: sessionError ? `FAILED: ${sessionError.message}` : `OK - ${data.session?.user.email || 'success'}`, type: sessionError ? 'error' : 'success' })

                        if (!sessionError && data.session) {
                            // Backup session
                            await backupSession(data.session.access_token, data.session.refresh_token)
                            await clearCodeVerifierBackup()

                            // Wait for storage writes to complete
                            await new Promise(resolve => setTimeout(resolve, 800))

                            // Verify session is readable from the same client
                            const { data: verifyData } = await supabase.auth.getSession()
                            toast({ title: 'Step 4/6: Verify', description: verifyData.session ? 'Session readable' : 'Session NOT readable!', type: verifyData.session ? 'success' : 'error' })

                            // Check storage directly
                            const stored = await capacitorStorage.getItem('sb-raute-auth')
                            toast({ title: 'Step 5/6: Storage', description: stored ? `Stored (${stored.length} chars)` : 'EMPTY!', type: stored ? 'success' : 'error' })

                            toast({ title: 'Step 6/6: Navigate', description: 'Going to dashboard...', type: 'info' })
                            oauthExchangeInProgress = false
                            processingCode = null
                            window.location.href = '/dashboard'
                            return
                        }
                        lastError = sessionError?.message || 'Unknown error'
                    } catch (err: any) {
                        lastError = err?.message || 'Exception'
                        toast({ title: 'Step 3/6: Exchange', description: `ERROR: ${lastError}`, type: 'error' })
                    }

                    // Attempt 2: Restore code verifier from backup, then retry
                    console.log('🔄 Restoring code verifier from backup...')
                    toast({ title: 'Attempt 2', description: 'Restoring verifier from backup...', type: 'info' })
                    const restored = await restoreCodeVerifier()
                    if (restored) {
                        await new Promise(resolve => setTimeout(resolve, 300))
                        try {
                            const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
                            if (!sessionError && data.session) {
                                toast({ title: 'Attempt 2 OK', description: 'Exchange succeeded with restored verifier', type: 'success' })
                                await backupSession(data.session.access_token, data.session.refresh_token)
                                await clearCodeVerifierBackup()
                                oauthExchangeInProgress = false
                                processingCode = null
                                await new Promise(resolve => setTimeout(resolve, 500))
                                window.location.href = '/dashboard'
                                return
                            }
                            lastError = sessionError?.message || 'Unknown error'
                            toast({ title: 'Attempt 2 Failed', description: lastError, type: 'error' })
                        } catch (err: any) {
                            lastError = err?.message || 'Exception'
                            toast({ title: 'Attempt 2 Error', description: lastError, type: 'error' })
                        }
                    } else {
                        toast({ title: 'Attempt 2 Skip', description: 'No backup verifier found', type: 'info' })
                    }

                    // Attempt 3: Check if session was set by onAuthStateChange
                    toast({ title: 'Attempt 3', description: 'Checking for existing session...', type: 'info' })
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    const { data: sessionData } = await supabase.auth.getSession()
                    if (sessionData.session) {
                        toast({ title: 'Attempt 3 OK', description: 'Found existing session', type: 'success' })
                        await backupSession(sessionData.session.access_token, sessionData.session.refresh_token)
                        await clearCodeVerifierBackup()
                        oauthExchangeInProgress = false
                        processingCode = null
                        await new Promise(resolve => setTimeout(resolve, 500))
                        window.location.href = '/dashboard'
                        return
                    }

                    // All attempts failed
                    console.log('🧹 PKCE exchange failed, clearing all auth data...')
                    oauthExchangeInProgress = false
                    processingCode = null
                    await supabase.auth.signOut({ scope: 'local' })
                    await capacitorStorage.clearAllAuthData()

                    toast({
                        title: 'All 3 Attempts Failed',
                        description: `Last error: ${lastError}`,
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
            // Reset global flags to prevent stuck state if component unmounts mid-exchange
            oauthExchangeInProgress = false
            processingCode = null
            subscription.unsubscribe()
            listener.then(handle => handle.remove())
            appStateListener.then(handle => handle.remove())
        }
    }, [toast, router])

    return null
}
