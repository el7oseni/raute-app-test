"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken) {
          // Set the session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('Auth callback error:', error)
            router.push('/login?error=auth_failed')
            return
          }

          // Check email verification
          const isEmailVerified = data.session?.user.email_confirmed_at

          if (!isEmailVerified) {
            router.push('/verify-email')
            return
          }

          // Success - redirect to dashboard
          router.push('/dashboard')
        } else {
          // No token found - redirect to login with error
          router.push('/login?error=no_token')
        }
      } catch (err) {
        console.error('Callback processing error:', err)
        router.push('/login?error=callback_failed')
      }
    }

    handleCallback()
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
