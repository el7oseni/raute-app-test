import { supabase } from '@/lib/supabase'

/**
 * Fetch wrapper that automatically includes the Supabase access token
 * in the Authorization header. Works for both web (cookies + header)
 * and native (header only).
 */
export async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession()

    const headers = new Headers(options.headers)
    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
    }
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json')
    }

    return fetch(url, {
        ...options,
        headers,
    })
}
