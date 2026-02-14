"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/toast-provider'

export function AuthListener() {
    const router = useRouter()
    const { toast } = useToast()

    useEffect(() => {
        // Listen for deep links (e.g. io.raute.app://auth/callback?code=...)
        const listener = App.addListener('appUrlOpen', async ({ url }) => {
            console.log('🔗 Deep link received:', url)

            // Only handle auth callbacks
            if (url.includes('auth/callback')) {
                // Close the in-app browser immediately
                try {
                    await Browser.close()
                } catch (e) {
                    // Browser might already be closed
                }

                // Small delay to let the app fully resume and storage become accessible
                await new Promise(resolve => setTimeout(resolve, 300))

                const parsedUrl = new URL(url)
                const code = parsedUrl.searchParams.get('code')
                const error = parsedUrl.searchParams.get('error')
                const errorDescription = parsedUrl.searchParams.get('error_description')

                // Also check hash fragment for tokens (implicit flow fallback)
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

                // Approach 1: PKCE code exchange
                if (code) {
                    console.log('🔐 Attempting PKCE code exchange...')
                    toast({
                        title: 'Verifying...',
                        description: 'Finalizing secure login',
                        type: 'info'
                    })

                    // Retry code exchange up to 3 times
                    let exchangeSuccess = false
                    for (let attempt = 0; attempt < 3; attempt++) {
                        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

                        if (!sessionError && data.session) {
                            console.log('✅ Session established via PKCE code exchange')
                            exchangeSuccess = true
                            toast({
                                title: 'Welcome Back!',
                                description: 'Successfully logged in.',
                                type: 'success'
                            })
                            router.push('/dashboard')
                            return
                        }

                        console.warn(`⚠️ Code exchange attempt ${attempt + 1} failed:`, sessionError?.message)

                        if (attempt < 2) {
                            await new Promise(resolve => setTimeout(resolve, 500))
                        }
                    }

                    // Approach 2: Fallback - check if session was established by another mechanism
                    if (!exchangeSuccess) {
                        console.log('🔄 Code exchange failed, checking for existing session...')
                        await new Promise(resolve => setTimeout(resolve, 1000))

                        const { data: sessionData } = await supabase.auth.getSession()
                        if (sessionData.session) {
                            console.log('✅ Session found via fallback check')
                            toast({
                                title: 'Welcome Back!',
                                description: 'Successfully logged in.',
                                type: 'success'
                            })
                            router.push('/dashboard')
                            return
                        }

                        toast({
                            title: 'Login Failed',
                            description: 'Could not complete sign in. Please try again.',
                            type: 'error'
                        })
                    }
                    return
                }

                // Approach 3: Handle implicit flow tokens in hash fragment
                if (accessToken && refreshToken) {
                    console.log('🔐 Setting session from hash tokens...')
                    const { error: setError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (!setError) {
                        console.log('✅ Session established via hash tokens')
                        toast({
                            title: 'Welcome Back!',
                            description: 'Successfully logged in.',
                            type: 'success'
                        })
                        router.push('/dashboard')
                    } else {
                        console.error('❌ Failed to set session from tokens:', setError)
                        toast({
                            title: 'Login Failed',
                            description: 'Could not complete sign in.',
                            type: 'error'
                        })
                    }
                    return
                }

                // Approach 4: No code or tokens — check if session exists anyway
                console.log('🔄 No code or tokens in URL, checking for session...')
                await new Promise(resolve => setTimeout(resolve, 1000))
                const { data: fallbackSession } = await supabase.auth.getSession()
                if (fallbackSession.session) {
                    console.log('✅ Session found via final fallback')
                    toast({
                        title: 'Welcome Back!',
                        description: 'Successfully logged in.',
                        type: 'success'
                    })
                    router.push('/dashboard')
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
            listener.then(handle => handle.remove())
            appStateListener.then(handle => handle.remove())
        }
    }, [router, toast])

    return null
}
