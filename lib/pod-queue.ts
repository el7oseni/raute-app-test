// ============================================
// POD OFFLINE QUEUE UTILITY
// ============================================
// Handles offline POD capture with retry mechanism

interface QueuedPOD {
    orderId: string
    imageDataUrl: string
    timestamp: number
    retryCount: number
}

const POD_QUEUE_KEY = 'raute_pod_upload_queue'

export class PODOfflineQueue {

    /**
     * Add POD to offline queue
     */
    static async addToQueue(orderId: string, imageDataUrl: string): Promise<void> {
        const queue = this.getQueue()
        queue.push({
            orderId,
            imageDataUrl,
            timestamp: Date.now(),
            retryCount: 0
        })
        localStorage.setItem(POD_QUEUE_KEY, JSON.stringify(queue))
        console.log(`📦 POD queued for order ${orderId}`)
    }

    /**
     * Get current queue
     */
    static getQueue(): QueuedPOD[] {
        try {
            const stored = localStorage.getItem(POD_QUEUE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch {
            return []
        }
    }

    /**
     * Process queue (attempt uploads)
     */
    static async processQueue(supabase: any): Promise<{ success: number, failed: number }> {
        const queue = this.getQueue()
        if (queue.length === 0) return { success: 0, failed: 0 }

        console.log(`📤 Processing ${queue.length} queued PODs...`)

        let successCount = 0
        let failedCount = 0
        const remainingQueue: QueuedPOD[] = []

        for (const pod of queue) {
            try {
                // Convert data URL to blob
                const response = await fetch(pod.imageDataUrl)
                const blob = await response.blob()
                const filename = `proof-${pod.orderId}-${pod.timestamp}.jpg`

                // Attempt upload
                const { data, error } = await supabase.storage
                    .from('proofs')
                    .upload(filename, blob)

                if (error) throw error

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('proofs')
                    .getPublicUrl(filename)

                // Update order
                await supabase
                    .from('orders')
                    .update({
                        proof_url: publicUrl,
                        status: 'delivered'
                    })
                    .eq('id', pod.orderId)

                console.log(`✅ POD uploaded for order ${pod.orderId}`)
                successCount++

            } catch (error) {
                console.error(`❌ POD upload failed for order ${pod.orderId}:`, error)

                // Retry logic: Keep in queue if retries < 3
                if (pod.retryCount < 3) {
                    remainingQueue.push({
                        ...pod,
                        retryCount: pod.retryCount + 1
                    })
                } else {
                    console.error(`🚫 POD abandoned after 3 retries: ${pod.orderId}`)
                }
                failedCount++
            }
        }

        // Update queue with remaining items
        localStorage.setItem(POD_QUEUE_KEY, JSON.stringify(remainingQueue))
        return { success: successCount, failed: failedCount }
    }

    /**
     * Clear queue
     */
    static clearQueue(): void {
        localStorage.removeItem(POD_QUEUE_KEY)
    }

    /**
     * Get queue size
     */
    static getQueueSize(): number {
        return this.getQueue().length
    }
}
