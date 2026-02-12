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
 * @param maxRetries - Number of retries (default: 5)
 * @param delayMs - Delay between retries in ms (default: 500)
 * @returns The session, or null if not found after all retries
 */
export async function waitForSession(
    maxRetries = 5,
    delayMs = 500
): Promise<Session | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
            console.error('waitForSession error:', error)
            return null
        }
        
        if (data.session) {
            return data.session
        }
        
        if (attempt < maxRetries) {
            console.log(`⏳ waitForSession: no session yet (attempt ${attempt + 1}/${maxRetries + 1})`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }
    
    console.warn('⚠️ waitForSession: no session after all retries')
    return null
}
