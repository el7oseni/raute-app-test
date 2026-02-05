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
                // Extract code or error from URL
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

                    // Manual PKCE Exchange
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
                        // Force refresh to sync checks
                        await supabase.auth.refreshSession()
                        
                        // Wait for session to be persisted to storage
                        await new Promise(resolve => setTimeout(resolve, 500))

                        toast({
                            title: 'Welcome Back!',
                            description: 'Successfully logged in.',
                            type: 'success'
                        })

                        // Use router for smooth navigation
                        router.push('/dashboard')
                    }
                }
            }
        })

        return () => {
            listener.then(handle => handle.remove())
        }
    }, [router, toast])

    return null
}
