import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * Wait for a Supabase session with retries.
 *
 * On Capacitor (iOS/Android), session restoration from Preferences is async.
 * After login, router.push fires immediately but getSession() may return null
 * because the session hasn't been persisted/read from native storage yet.
 *
 * Uses getUser() as initial fast check to avoid lock contention with
 * Supabase's internal auth initialization, then falls back to getSession()
 * only when needed for the full session object.
 *
 * @param maxRetries - Number of retries (default: 5)
 * @param delayMs - Delay between retries in ms (default: 500)
 * @returns The session, or null if not found after all retries
 */
export async function waitForSession(
    maxRetries = 5,
    delayMs = 500
): Promise<Session | null> {
    // Fast path: try getUser() first — it doesn't contend on the auth lock
    // and avoids the "Lock busy / getSession timeout" errors
    try {
        const { data: { user }, error: userError } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('getUser timeout')), 3000)
            ),
        ])

        if (!userError && user) {
            // User exists — now get the full session (should be fast since auth is initialized)
            const { data, error } = await Promise.race([
                supabase.auth.getSession(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('getSession timeout')), 3000)
                ),
            ])

            if (!error && data.session) {
                return data.session
            }
        }
    } catch {
        // getUser timed out or failed — fall through to retry loop
    }

    // Retry loop for Capacitor cold starts where session isn't ready yet
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { data, error } = await Promise.race([
                supabase.auth.getSession(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('getSession timeout')), 5000)
                ),
            ])

            if (error) {
                console.error('⚠️ waitForSession error:', error.message)

                // Handle session validation errors
                if (error.message.includes('string did not match') ||
                    error.message.includes('pattern') ||
                    error.message.includes('Invalid')) {
                    console.warn('⚠️ Session validation error - clearing corrupted data')

                    // Clear corrupted session
                    try {
                        await supabase.auth.signOut({ scope: 'local' })
                        const { capacitorStorage } = await import('@/lib/capacitor-storage')
                        await capacitorStorage.clearAllAuthData()
                    } catch (cleanupErr) {
                        console.error('Cleanup failed:', cleanupErr)
                    }

                    return null
                }

                // For other errors, don't continue retrying
                return null
            }

            if (data.session) {
                // Validate session data before returning
                if (!data.session.access_token || !data.session.user) {
                    console.error('❌ Invalid session data structure')
                    return null
                }

                return data.session
            }

            if (attempt < maxRetries) {
                const currentDelay = attempt < 2 ? 300 : delayMs
                await new Promise(resolve => setTimeout(resolve, currentDelay))
            }
        } catch (err: any) {
            console.error('❌ waitForSession exception:', err.message)

            // On timeout, try getUser() as fallback
            if (err.message === 'getSession timeout' && attempt < maxRetries) {
                try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        // We have a user but getSession is blocked — wait and retry
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        continue
                    }
                } catch {
                    // getUser also failed
                }
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }
        }
    }

    console.warn('⚠️ waitForSession: no session after all retries')
    return null
}
