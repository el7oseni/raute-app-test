"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export default function AuthCallback() {
  const router = useRouter()
  const hasRedirected = useRef(false)
  const [status, setStatus] = useState('Completing sign in...')
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (msg: string) => {
    console.log(`🔐 ${msg}`)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  useEffect(() => {
    // Helper: sync role and redirect to dashboard
    const syncRoleAndRedirect = async (userId: string, emailConfirmedAt: string | null | undefined) => {
      if (hasRedirected.current) return
      hasRedirected.current = true

      // Check email verification
      if (!emailConfirmedAt) {
        addDebug('Email not verified, redirecting...')
        window.location.href = '/verify-email'
        return
      }

      // Redirect to dashboard immediately — don't block on role sync.
      addDebug('SUCCESS! Redirecting to dashboard...')
      setStatus('Redirecting to dashboard...')

      // Fire role sync in background (don't await)
      authenticatedFetch('/api/sync-user-role').catch(() => {})

      window.location.href = '/dashboard'
    }

    // Check for OAuth errors first
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))

    const oauthError = searchParams.get('error') || hashParams.get('error')
    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description')

    if (oauthError) {
      addDebug(`⚠️ OAuth Error: ${oauthError}`)
      addDebug(`Description: ${decodeURIComponent(errorDesc || 'Unknown error')}`)
      setStatus(`Sign in failed: ${decodeURIComponent(errorDesc || oauthError)}`)

      setTimeout(() => {
        if (!hasRedirected.current) {
          hasRedirected.current = true
          window.location.href = `/login?error=${oauthError}`
        }
      }, 5000)
      return
    }

    addDebug(`URL search: ${window.location.search || '(empty)'}`)
    addDebug(`URL hash: ${window.location.hash ? window.location.hash.substring(0, 50) + '...' : '(empty)'}`)

    // === PRIMARY APPROACH: onAuthStateChange listener ===
    // createBrowserClient has detectSessionInUrl: true by default (PKCE flow).
    // It will automatically detect the ?code= parameter, exchange it for a session,
    // and fire SIGNED_IN via onAuthStateChange. We just need to listen for it.
    addDebug('Waiting for Supabase to auto-detect session from URL...')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addDebug(`Auth event: ${event}, hasSession: ${!!session}`)

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        addDebug(`Session found via ${event}! User: ${session.user.email}`)
        syncRoleAndRedirect(session.user.id, session.user.email_confirmed_at)
      }
    })

    // === FALLBACK: Handle hash tokens (implicit flow — less common) ===
    const handleHashTokens = async () => {
      const hash = window.location.hash
      if (!hash) return

      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        addDebug('Found access_token in hash, calling setSession...')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (error) {
          addDebug(`setSession error: ${error.message}`)
        } else if (data.session) {
          addDebug('Session set from hash tokens!')
          await syncRoleAndRedirect(data.session.user.id, data.session.user.email_confirmed_at)
        }
      }
    }

    handleHashTokens()

    // === POLLING FALLBACK ===
    // In case detectSessionInUrl or onAuthStateChange doesn't fire
    const pollInterval = setInterval(async () => {
      if (hasRedirected.current) return

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        addDebug('Session found via polling!')
        clearInterval(pollInterval)
        await syncRoleAndRedirect(data.session.user.id, data.session.user.email_confirmed_at)
      }
    }, 1000)

    // === TIMEOUT: Give up after 15 seconds ===
    const timeout = setTimeout(() => {
      if (hasRedirected.current) return
      clearInterval(pollInterval)

      addDebug('TIMEOUT: No session after 15 seconds')
      setStatus('Authentication timed out. Please try again.')

      setTimeout(() => {
        if (!hasRedirected.current) {
          window.location.href = '/login?error=no_session'
        }
      }, 3000)
    }, 15000)

    return () => {
      subscription.unsubscribe()
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4 max-w-md px-4">
        <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">{status}</p>

        {/* Debug info - visible in production temporarily for troubleshooting */}
        {debugInfo.length > 0 && (
          <div className="mt-6 text-left bg-slate-100 dark:bg-slate-900 p-3 rounded-lg max-h-48 overflow-y-auto">
            <p className="text-xs font-mono text-slate-500 mb-1">Debug Log:</p>
            {debugInfo.map((info, i) => (
              <p key={i} className="text-xs font-mono text-slate-400">{info}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
