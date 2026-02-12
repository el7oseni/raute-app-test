import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Custom Storage Adapter for Supabase Auth
 * Uses Capacitor Preferences on native platforms (iOS/Android)
 * Falls back to localStorage on web
 *
 * IMPORTANT: This adapter includes validation and auto-cleanup for corrupted session data
 */
export const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      let value: string | null = null

      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        const result = await Preferences.get({ key })
        value = result.value
      }
      // Fallback to localStorage on web
      else if (typeof window !== 'undefined') {
        value = window.localStorage.getItem(key)
      }

      // Validate session data (if it's a Supabase auth key)
      if (value && key.includes('supabase.auth.token')) {
        try {
          // Try to parse as JSON to validate format
          const parsed = JSON.parse(value)

          // Validate that it has the expected structure
          if (!parsed || typeof parsed !== 'object') {
            console.warn('⚠️ Invalid session format detected, clearing:', key)
            await this.removeItem(key)
            return null
          }

          // If it's session data, validate tokens
          if (parsed.access_token || parsed.refresh_token) {
            // Basic JWT format validation (header.payload.signature)
            const validateJWT = (token: string) => {
              if (!token) return false
              const parts = token.split('.')
              return parts.length === 3 && parts.every(p => p.length > 0)
            }

            if (parsed.access_token && !validateJWT(parsed.access_token)) {
              console.warn('⚠️ Invalid access_token format, clearing session')
              await this.removeItem(key)
              return null
            }

            if (parsed.refresh_token && !validateJWT(parsed.refresh_token)) {
              console.warn('⚠️ Invalid refresh_token format, clearing session')
              await this.removeItem(key)
              return null
            }
          }
        } catch (parseError) {
          // If parsing fails, clear the corrupted data
          console.error('⚠️ Failed to parse session data, clearing:', parseError)
          await this.removeItem(key)
          return null
        }
      }

      return value
    } catch (error) {
      console.error('❌ Storage getItem error:', error)
      // Try to clear the corrupted key
      try {
        await this.removeItem(key)
      } catch {}
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Validate before storing (if it's a Supabase auth key)
      if (key.includes('supabase.auth.token')) {
        try {
          // Ensure it's valid JSON
          const parsed = JSON.parse(value)
          if (!parsed || typeof parsed !== 'object') {
            console.error('❌ Refusing to store invalid session data')
            return
          }
        } catch (parseError) {
          console.error('❌ Refusing to store malformed JSON:', parseError)
          return
        }
      }

      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key, value })
        console.log('✅ Stored to Capacitor Preferences:', key.substring(0, 30))
        return
      }

      // Fallback to localStorage on web
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('❌ Storage setItem error:', error)
      // If storage fails, try to clear the key to prevent corruption
      try {
        await this.removeItem(key)
      } catch {}
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key })
        console.log('🗑️ Removed from Capacitor Preferences:', key.substring(0, 30))
        return
      }

      // Fallback to localStorage on web
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('❌ Storage removeItem error:', error)
    }
  },

  /**
   * Clear ALL Supabase auth data from storage
   * Useful for recovering from corrupted session state
   */
  async clearAllAuthData(): Promise<void> {
    console.log('🧹 Clearing all auth data from storage...')
    try {
      if (Capacitor.isNativePlatform()) {
        // Get all keys and remove Supabase-related ones
        const { keys } = await Preferences.keys()
        const authKeys = keys.filter(key =>
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('session')
        )

        for (const key of authKeys) {
          await Preferences.remove({ key })
          console.log('🗑️ Cleared:', key)
        }
      } else if (typeof window !== 'undefined') {
        // Clear from localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key))
      }
      console.log('✅ Auth data cleared successfully')
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error)
    }
  }
}
