"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
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
                const parsedUrl = new URL(url)
                const code = parsedUrl.searchParams.get('code')
                const error = parsedUrl.searchParams.get('error')
                const errorDescription = parsedUrl.searchParams.get('error_description')

                if (error) {
                    toast({
                        title: 'Login Error',
                        description: errorDescription || error,
                        type: 'error'
                    })
                    return
                }

                if (code) {
                    toast({
                        title: 'Verifying...',
                        description: 'Finalizing secure login',
                        type: 'info'
                    })

                    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

                    if (sessionError) {
                        console.error('Code exchange failed:', sessionError)
                        toast({
                            title: 'Login Failed',
                            description: 'Could not exchange code for session.',
                            type: 'error'
                        })
                    } else if (data.session) {
                        console.log('✅ Session established via Deep Link')
                        toast({
                            title: 'Welcome Back!',
                            description: 'Successfully logged in.',
                            type: 'success'
                        })
                        router.push('/dashboard')
                    }
                }
            }
        })

        // Listen for app state changes (resume/pause)
        // IMPORTANT: Do NOT run cleanup on resume — it was deleting active session tokens
        // On resume, just let Supabase auto-refresh the token if needed
        const appStateListener = App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
                console.log('📱 App resumed')
                // Simply trigger a session refresh — Supabase handles the rest
                // Do NOT run cleanup or signOut here
                try {
                    const { data } = await supabase.auth.getSession()
                    if (data.session) {
                        // Session exists — trigger a refresh to keep it alive
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
