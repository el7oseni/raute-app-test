"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const hasHandled = useRef(false)

  useEffect(() => {
    if (hasHandled.current) return
    hasHandled.current = true

    const handleCallback = async () => {
      try {
        console.log('🔐 Auth Callback started:', {
          hash: window.location.hash ? '(has hash)' : '(no hash)',
          search: window.location.search ? '(has search)' : '(no search)',
        })

        // Step 1: Check if there are tokens in the URL hash (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken) {
          // Manually set session from hash tokens
          console.log('🔑 Found access_token in hash, setting session...')
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('❌ setSession failed:', error)
            window.location.href = '/login?error=auth_failed'
            return
          }

          if (data.session) {
            await syncRoleAndRedirect(data.session.user.id, data.session.user.email_confirmed_at)
            return
          }
        }

        // Step 2: Check for authorization code (PKCE flow)
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          console.log('🔑 Found authorization code, exchanging...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('❌ Code exchange failed:', error)
            window.location.href = '/login?error=auth_failed'
            return
          }

          if (data.session) {
            await syncRoleAndRedirect(data.session.user.id, data.session.user.email_confirmed_at)
            return
          }
        }

        // Step 3: Supabase detectSessionInUrl may have already handled the tokens
        // Wait a moment for session to be established, then check
        console.log('⏳ No tokens/code found directly, waiting for auto-detection...')
        await new Promise(resolve => setTimeout(resolve, 1500))

        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          console.log('✅ Session found after auto-detection')
          await syncRoleAndRedirect(
            sessionData.session.user.id,
            sessionData.session.user.email_confirmed_at
          )
          return
        }

        // Step 4: One more retry after a longer delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        const { data: retryData } = await supabase.auth.getSession()
        if (retryData.session) {
          console.log('✅ Session found on retry')
          await syncRoleAndRedirect(
            retryData.session.user.id,
            retryData.session.user.email_confirmed_at
          )
          return
        }

        // Final: No session found at all
        console.error('❌ No session found after all attempts')
        window.location.href = '/login?error=no_session'

      } catch (err) {
        console.error('💥 Callback processing error:', err)
        window.location.href = '/login?error=callback_failed'
      }
    }

    // Helper: sync role and redirect to dashboard
    async function syncRoleAndRedirect(userId: string, emailConfirmedAt: string | null | undefined) {
      // Check email verification
      if (!emailConfirmedAt) {
        console.log('📧 Email not verified, redirecting...')
        window.location.href = '/verify-email'
        return
      }

      // Sync role from DB to session metadata (fire and forget)
      try {
        await fetch(`/api/sync-user-role?userId=${userId}`)
        console.log('✅ Role synced to session metadata')
      } catch (syncErr) {
        console.warn('⚠️ Role sync failed (non-critical):', syncErr)
      }

      // Success - redirect to dashboard
      console.log('✅ OAuth success, redirecting to dashboard')
      window.location.href = '/dashboard'
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
