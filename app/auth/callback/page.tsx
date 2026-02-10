"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        const isNative = Capacitor.isNativePlatform()
        
        // Get params from either hash fragment or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)
        
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')

        console.log('🔐 Auth Callback:', { 
          isNative, 
          hasAccessToken: !!accessToken,
          hash: window.location.hash,
          search: window.location.search
        })

        if (accessToken) {
          // Set the session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('Auth callback error:', error)
            window.location.href = '/login?error=auth_failed'
            return
          }

          // Check email verification
          const isEmailVerified = data.session?.user.email_confirmed_at

          if (!isEmailVerified) {
            window.location.href = '/verify-email'
            return
          }

          // Success - redirect to dashboard
          console.log('✅ OAuth success, redirecting to dashboard')
          window.location.href = '/dashboard'
        } else {
          // No token found - redirect to login with error
          console.error('❌ No access token found in callback')
          window.location.href = '/login?error=no_token'
        }
      } catch (err) {
        console.error('Callback processing error:', err)
        window.location.href = '/login?error=callback_failed'
      }
    }

    // Handle deep link on native platforms
    if (Capacitor.isNativePlatform()) {
      // Listen for app URL open events (deep links)
      CapacitorApp.addListener('appUrlOpen', (data) => {
        console.log('📱 Deep link received:', data.url)
        
        // Extract the hash/query from the deep link
        const url = new URL(data.url)
        
        // If this is our auth callback, extract the tokens
        if (url.pathname.includes('/auth/callback')) {
          // Update window location to trigger our callback handler
          window.location.hash = url.hash
          window.location.search = url.search
          handleCallback()
        }
      })
    }

    handleCallback()

    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.removeAllListeners()
      }
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Completing sign in...</p>
      </div>
    </div>
  )
}
