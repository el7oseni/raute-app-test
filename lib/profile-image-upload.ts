/**
 * Profile Image Upload Handler
 * Compresses and uploads avatar to Supabase storage
 */

import { supabase } from '@/lib/supabase'
import { ImageCompressor } from './image-compressor'

export async function uploadProfileImage(file: File, userId: string): Promise<string> {
    try {
        // Convert File to Blob
        const blob = new Blob([await file.arrayBuffer()], { type: file.type })

        // Compress image (max 512x512 for avatars)
        const compressedBlob = await ImageCompressor.compressFromBlob(blob)

        // Generate filename
        const timestamp = Date.now()
        const filename = `avatars/${userId}-${timestamp}.jpg`

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from('profiles')
            .upload(filename, compressedBlob, {
                upsert: true,
                contentType: 'image/jpeg'
            })

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(filename)

        return publicUrl

    } catch (error) {
        console.error('Profile image upload error:', error)
        throw error
    }
}

/**
 * Delete old profile image
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
    try {
        // Extract filename from URL
        const urlParts = imageUrl.split('/profiles/')
        if (urlParts.length < 2) return

        const filename = urlParts[1]

        await supabase.storage
            .from('profiles')
            .remove([filename])

    } catch (error) {
        console.error('Profile image deletion error:', error)
        // Don't throw, deletion failure shouldn't block upload
    }
}
