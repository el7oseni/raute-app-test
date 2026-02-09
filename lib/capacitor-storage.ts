import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Custom Storage Adapter for Supabase Auth
 * Uses Capacitor Preferences on native platforms (iOS/Android)
 * Falls back to localStorage on web
 */
export const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key })
        return value
      }
      
      // Fallback to localStorage on web
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key)
      }
      
      return null
    } catch (error) {
      console.error('Storage getItem error:', error)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key, value })
        return
      }
      
      // Fallback to localStorage on web
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('Storage setItem error:', error)
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      // Use Capacitor Preferences on native platforms
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key })
        return
      }
      
      // Fallback to localStorage on web
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Storage removeItem error:', error)
    }
  },
}
