import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

/**
 * Cleanup orphaned session data from old storage implementations
 * This fixes issues where the app migrated from localStorage/Capacitor Preferences to cookies
 */
export async function cleanupOrphanedSessions() {
    if (!Capacitor.isNativePlatform()) {
        console.log('📱 Web platform - skipping Capacitor storage cleanup')
        return
    }

    try {
        console.log('🧹 Starting orphaned session cleanup...')
        
        // Old keys from capacitor-storage-adapter implementation
        const oldKeys = [
            'sb-ysqcovxkqviufagguvue-auth-token',
            'sb-ysqcovxkqviufagguvue-auth-token.0',
            'sb-ysqcovxkqviufagguvue-auth-token.1',
            'sb-ysqcovxkqviufagguvue-auth-token.2',
            'sb-ysqcovxkqviufagguvue-auth-token.3',
            'sb-ysqcovxkqviufagguvue-auth-token.4',
            'sb-ysqcovxkqviufagguvue-auth-token-code-verifier',
        ]

        let removedCount = 0
        for (const key of oldKeys) {
            const { value } = await Preferences.get({ key })
            if (value) {
                await Preferences.remove({ key })
                removedCount++
                console.log(`  ✓ Removed: ${key}`)
            }
        }

        if (removedCount > 0) {
            console.log(`✅ Cleaned up ${removedCount} orphaned session keys`)
        } else {
            console.log('✅ No orphaned session data found')
        }
    } catch (error) {
        console.error('❌ Session cleanup failed:', error)
    }
}

/**
 * Check if session data appears corrupted or invalid
 */
export function isSessionCorrupted(session: unknown): boolean {
    if (!session) return false
    
    // Type guard: check if session is an object
    if (typeof session !== 'object') return true

    try {
        const sess = session as Record<string, any>
        
        // Basic validation checks
        if (!sess.access_token || typeof sess.access_token !== 'string') {
            console.warn('⚠️ Invalid access_token format')
            return true
        }

        if (!sess.user || !sess.user.id) {
            console.warn('⚠️ Missing user data')
            return true
        }

        // Check token expiry
        if (sess.expires_at) {
            const expiryTime = new Date(sess.expires_at * 1000).getTime()
            const now = Date.now()
            if (expiryTime < now) {
                console.warn('⚠️ Session expired')
                return true
            }
        }

        return false
    } catch (error) {
        console.error('❌ Session validation error:', error)
        return true
    }
}
