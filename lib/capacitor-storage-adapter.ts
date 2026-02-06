import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Custom storage adapter for Supabase that uses Capacitor Preferences
 * on native platforms and falls back to localStorage on web.
 * 
 * This fixes the session persistence issue on mobile apps where
 * localStorage doesn't work reliably with Capacitor.
 */
export const capacitorStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key })
      console.log('📦 [Storage] GET (native):', { key, hasValue: !!value, valueLength: value?.length })
      return value
    }
    const value = localStorage.getItem(key)
    console.log('📦 [Storage] GET (web):', { key, hasValue: !!value, valueLength: value?.length })
    return value
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value })
      console.log('📦 [Storage] SET (native):', { key, valueLength: value?.length })
    } else {
      localStorage.setItem(key, value)
      console.log('📦 [Storage] SET (web):', { key, valueLength: value?.length })
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key })
      console.log('📦 [Storage] REMOVE (native):', { key })
    } else {
      localStorage.removeItem(key)
      console.log('📦 [Storage] REMOVE (web):', { key })
    }
  },
}
