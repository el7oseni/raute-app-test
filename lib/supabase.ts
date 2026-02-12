import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { capacitorStorage } from './capacitor-storage'
import { Capacitor } from '@capacitor/core'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Detect if running on native platform (iOS/Android)
const isNativePlatform = typeof window !== 'undefined' && Capacitor.isNativePlatform()

// Create Supabase client with platform-appropriate configuration
// CRITICAL FIX: On native platforms, use createClient (not createBrowserClient)
// createBrowserClient is designed for cookie-based SSR auth which doesn't work on Capacitor
// because there's no server to set/read cookies. On native, we use capacitorStorage
// (Capacitor Preferences API) for session persistence instead.
function createSupabaseClient() {
    if (typeof window === 'undefined') {
        // Server-side rendering — no session needed
        return createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
            }
        })
    }

    if (isNativePlatform) {
        console.log('🔧 Creating Supabase client for NATIVE platform')
        // Native platform (iOS/Android) — use standard client with Capacitor storage
        // This avoids the cookie-based auth flow that createBrowserClient uses
        return createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: capacitorStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false, // Deep links handled by AuthListener
                flowType: 'pkce', // Use PKCE flow for better security on native
                debug: false, // Set to true for debugging
                // Add storage key to avoid conflicts
                storageKey: 'sb-raute-auth',
            },
            // Add global error handler
            global: {
                headers: {
                    'x-client-info': 'raute-app-ios',
                }
            }
        })
    }

    console.log('🔧 Creating Supabase client for WEB platform')
    // Web browser — use SSR-compatible browser client (cookie-based)
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: capacitorStorage, // Falls back to localStorage on web
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce', // Use PKCE flow for better security
            storageKey: 'sb-raute-auth',
        },
    })
}

export const supabase = createSupabaseClient()

// Create Admin Client (Server-side only, uses Service Role Key)
// ⚠️ NEVER expose this client or the Service Role Key to the browser
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase // Fallback to regular client if Service Role Key is not set

// Database Types (for TypeScript)
export type Company = {
    id: string
    name: string
    created_at: string
    updated_at: string
}

export type User = {
    id: string
    company_id: string
    email: string
    full_name: string
    role: 'admin' | 'manager' | 'driver' | 'dispatcher'
    status?: 'active' | 'suspended'
    permissions?: Record<string, boolean>
    created_at: string
    updated_at: string
}

export type Driver = {
    id: string
    company_id: string
    user_id: string | null
    name: string
    phone: string | null
    vehicle_type: string | null
    status: 'active' | 'inactive'
    is_online?: boolean
    custom_values?: Record<string, any>
    default_start_address?: string | null
    default_start_lat?: number | null
    default_start_lng?: number | null
    starting_point_lat?: number | null
    starting_point_lng?: number | null
    starting_point_address?: string | null
    use_manual_start?: boolean
    current_lat?: number | null
    current_lng?: number | null
    last_location_update?: string | null
    created_at: string
    updated_at: string
    email?: string // Added for UI display
}

export type CustomField = {
    id: string
    company_id: string
    entity_type: 'order' | 'driver'
    field_name: string
    field_type: 'text' | 'number' | 'date' | 'select' | 'textarea'
    field_label: string
    placeholder?: string
    options?: string[] // For select type
    is_required: boolean
    driver_visible: boolean // Show to drivers by default?
    display_order: number
    created_at: string
    updated_at: string
}

export type Order = {
    id: string
    company_id: string
    driver_id: string | null
    order_number: string
    customer_name: string
    address: string
    city: string | null
    state: string | null
    zip_code: string | null
    phone: string | null
    delivery_date: string | null
    status: 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled'
    priority: number
    priority_level?: 'normal' | 'high' | 'critical'
    is_pinned?: boolean
    notes: string | null
    latitude: number | null
    longitude: number | null
    custom_fields: Record<string, any> // Dynamic custom field values
    driver_visible_overrides: string[] // Field IDs to show to driver for this order
    route_index?: number | null
    pin_reason?: string
    assigned_at?: string // For route sequencing (1, 2, 3...)
    // locked_to_driver removed in favor of is_pinned
    time_window_start?: string | null // HH:MM:SS
    time_window_end?: string | null // HH:MM:SS
    delivered_at: string | null
    geocoding_confidence?: 'exact' | 'approximate' | 'low' | 'failed'
    geocoded_address?: string
    geocoding_attempted_at?: string
    created_at: string
    updated_at: string
    proof_url?: string | null
    signature_url?: string | null
    signature_required?: boolean
}

export type ProofImage = {
    id: string
    order_id: string
    company_id: string
    image_url: string
    uploaded_at: string
    uploaded_by: string | null
    created_at: string
}

export type DriverActivityLog = {
    id: string
    driver_id: string
    status: 'online' | 'offline' | 'working'
    timestamp: string
    metadata: any
}

export type Permission = 'create_orders' | 'delete_orders' | 'view_drivers' | 'manage_drivers' | 'view_map' | 'access_settings'
