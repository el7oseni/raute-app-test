import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * Wait for a Supabase session with retries.
 *
 * On Capacitor (iOS/Android), session restoration from Preferences is async.
 * After login, router.push fires immediately but getSession() may return null
 * because the session hasn't been persisted/read from native storage yet.
 *
 * This utility retries getSession() with a delay, giving Capacitor time
 * to restore the session from disk.
 *
 * @param maxRetries - Number of retries (default: 8 for better mobile support)
 * @param delayMs - Delay between retries in ms (default: 500)
 * @returns The session, or null if not found after all retries
 */
export async function waitForSession(
    maxRetries = 8,
    delayMs = 500
): Promise<Session | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const { data, error } = await supabase.auth.getSession()

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

                console.log('✅ waitForSession: session found', {
                    userId: data.session.user.id.substring(0, 8),
                    attempt: attempt + 1
                })
                return data.session
            }

            if (attempt < maxRetries) {
                // Use shorter delay for first few attempts
                const currentDelay = attempt < 3 ? 300 : delayMs
                console.log(`⏳ waitForSession: no session yet (attempt ${attempt + 1}/${maxRetries + 1})`)
                await new Promise(resolve => setTimeout(resolve, currentDelay))
            }
        } catch (err: any) {
            console.error('❌ waitForSession exception:', err.message)

            // On exception, wait a bit and try again (unless it's the last attempt)
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }
        }
    }

    console.warn('⚠️ waitForSession: no session after all retries')
    return null
}
