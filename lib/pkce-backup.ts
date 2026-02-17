import { Capacitor } from '@capacitor/core'

/**
 * PKCE Code Verifier Backup
 *
 * Problem: Supabase stores the PKCE code verifier in Capacitor Preferences
 * via our custom storage adapter. Sometimes this gets lost between
 * signInWithOAuth() and exchangeCodeForSession() (storage timing, app lifecycle).
 *
 * Solution: After signInWithOAuth(), we read the code verifier from Supabase's
 * storage key and save a redundant copy. Before exchangeCodeForSession(), we
 * check if the verifier is still there — if not, we restore from backup.
 */

const SUPABASE_STORAGE_KEY = 'sb-raute-auth'
const CODE_VERIFIER_KEY = `${SUPABASE_STORAGE_KEY}-code-verifier`
const BACKUP_KEY = 'raute-pkce-verifier-backup'

/**
 * Call this AFTER signInWithOAuth() and BEFORE Browser.open()
 * Reads the code verifier that Supabase just stored and saves a backup copy.
 */
export async function backupCodeVerifier(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
        const { Preferences } = await import('@capacitor/preferences')

        // Small delay to ensure Supabase's storage write completed
        await new Promise(resolve => setTimeout(resolve, 200))

        const { value } = await Preferences.get({ key: CODE_VERIFIER_KEY })
        if (value) {
            await Preferences.set({
                key: BACKUP_KEY,
                value: JSON.stringify({ verifier: value, saved_at: Date.now() })
            })
            console.log('💾 PKCE code verifier backed up successfully')
        } else {
            console.warn('⚠️ No code verifier found to backup')
        }
    } catch (err) {
        console.error('❌ Failed to backup code verifier:', err)
    }
}

/**
 * Call this BEFORE exchangeCodeForSession() if it fails.
 * Restores the code verifier from our backup to Supabase's expected key.
 */
export async function restoreCodeVerifier(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false

    try {
        const { Preferences } = await import('@capacitor/preferences')

        // First check if verifier already exists
        const { value: existing } = await Preferences.get({ key: CODE_VERIFIER_KEY })
        if (existing) {
            console.log('✅ Code verifier already exists, no restore needed')
            return true
        }

        // Read from backup
        const { value: backup } = await Preferences.get({ key: BACKUP_KEY })
        if (!backup) {
            console.warn('⚠️ No PKCE backup found')
            return false
        }

        const parsed = JSON.parse(backup)

        // Check if backup is too old (10 minutes)
        if (Date.now() - parsed.saved_at > 10 * 60 * 1000) {
            console.warn('⚠️ PKCE backup too old, clearing')
            await Preferences.remove({ key: BACKUP_KEY })
            return false
        }

        // Restore the code verifier
        await Preferences.set({ key: CODE_VERIFIER_KEY, value: parsed.verifier })
        console.log('✅ PKCE code verifier restored from backup!')
        return true
    } catch (err) {
        console.error('❌ Failed to restore code verifier:', err)
        return false
    }
}

/**
 * Clear the backup after successful exchange.
 */
export async function clearCodeVerifierBackup(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
        const { Preferences } = await import('@capacitor/preferences')
        await Preferences.remove({ key: BACKUP_KEY })
    } catch { /* ignore */ }
}
