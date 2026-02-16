import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase as defaultSupabase } from './supabase';

/**
 * Adaptive tracking intervals:
 * - Moving: 10s updates (real-time for fleet managers)
 * - Idle (not moved 100m+): 30s updates (saves battery)
 * - Background on web: 15s (browser may throttle anyway)
 */
const INTERVAL_MOVING = 10_000;   // 10 seconds when moving
const INTERVAL_IDLE = 30_000;     // 30 seconds when idle (battery saver)
const IDLE_THRESHOLD_METERS = 100;

class GeoService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private nativeWatchId: string | null = null;
    private userId: string | null = null;
    private companyId: string | null = null;
    private driverId: string | null = null;
    private supabaseClient: any = defaultSupabase;
    private isNative: boolean = false;
    private appStateListenerRemove: (() => void) | null = null;
    private currentInterval: number = INTERVAL_MOVING;
    private pendingLocationSync: boolean = false;

    // Idle detection
    private lastPosition: { lat: number; lng: number } | null = null;
    private idleSince: number | null = null;

    // Dedup: prevent double-syncs from watchPosition + interval firing together
    private lastSyncTime: number = 0;
    private readonly MIN_SYNC_GAP_MS = 5_000; // At least 5s between syncs

    public debugState = {
        lastAttempt: null as string | null,
        lastError: null as string | null,
        lastStatus: 'idle' as string,
        lastLocation: null as any,
        isTracking: false,
        driverId: null as string | null,
        trackingMode: 'none' as 'none' | 'native-watch' | 'interval' | 'hybrid'
    }

    async init(userId: string, authenticatedClient?: any, driverId?: string, companyId?: string) {
        this.userId = userId;
        this.isNative = Capacitor.isNativePlatform();
        if (authenticatedClient) {
            this.supabaseClient = authenticatedClient;
        }

        if (driverId && companyId) {
            this.driverId = driverId;
            this.companyId = companyId;
            return;
        }

        // Fallback: fetch driver & company ID
        const { data } = await this.supabaseClient.from('drivers').select('id, company_id').eq('user_id', userId).single();
        if (data) {
            this.driverId = data.id;
            this.companyId = data.company_id;
        }
    }

    /**
     * Start tracking with the best available method:
     *
     * NATIVE (iOS/Android):
     *   Uses Geolocation.watchPosition() — this hooks into CLLocationManager (iOS)
     *   and FusedLocationProvider (Android). With UIBackgroundModes:location in
     *   Info.plist, this continues in background on iOS.
     *   + A safety interval as fallback (in case watchPosition stalls)
     *
     * WEB:
     *   Uses setInterval + getCurrentPosition (browser manages permissions)
     */
    async startTracking() {
        if (this.debugState.isTracking) return;

        console.log('🚀 Starting location tracking...', this.isNative ? '(Native)' : '(Web)');
        this.debugState.isTracking = true;

        // Immediate first sync
        await this.logLocation();

        if (this.isNative) {
            await this.startNativeTracking();
        } else {
            this.startWebTracking();
        }

        // Listen for app resume to immediately sync location
        this.setupAppStateListener();
    }

    private async startNativeTracking() {
        try {
            // Request "Always" permission for background tracking
            const permStatus = await Geolocation.checkPermissions();
            if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
                const requested = await Geolocation.requestPermissions({ permissions: ['location'] });
                console.log('📍 Location permission result:', requested.location);
            }

            // Start native watchPosition — continues in background on iOS
            this.nativeWatchId = await Geolocation.watchPosition(
                { enableHighAccuracy: true },
                (position, err) => {
                    if (err) {
                        console.warn('⚠️ watchPosition error:', err);
                        return;
                    }
                    if (position) {
                        this.handleNativePosition(position);
                    }
                }
            );

            console.log('✅ Native watchPosition started, id:', this.nativeWatchId);
            this.debugState.trackingMode = 'hybrid';

            // Safety interval: if watchPosition stalls (e.g. device completely still),
            // force a sync every 30s to keep last_location_update fresh
            this.intervalId = setInterval(() => {
                const timeSinceSync = Date.now() - this.lastSyncTime;
                if (timeSinceSync > 25_000) {
                    console.log('⏰ Safety interval: forcing location sync');
                    this.logLocation();
                }
            }, 30_000);

        } catch (err) {
            console.warn('⚠️ Native watchPosition failed, falling back to interval:', err);
            this.startWebTracking();
        }
    }

    private startWebTracking() {
        this.debugState.trackingMode = 'interval';
        this.intervalId = setInterval(() => {
            this.logLocation();
        }, this.currentInterval);
    }

    /**
     * Handle position from native watchPosition callback.
     * Deduplicates with the safety interval to prevent double-syncs.
     */
    private async handleNativePosition(position: { coords: { latitude: number; longitude: number; accuracy: number } }) {
        const now = Date.now();
        if (now - this.lastSyncTime < this.MIN_SYNC_GAP_MS) return; // Dedup

        const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        await this.syncLocation(loc);
    }

    stopTracking() {
        this.debugState.isTracking = false;
        this.debugState.trackingMode = 'none';

        // Clear native watch
        if (this.nativeWatchId) {
            Geolocation.clearWatch({ id: this.nativeWatchId });
            this.nativeWatchId = null;
            console.log('🛑 Native watchPosition stopped');
        }

        // Clear interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Remove app state listener
        if (this.appStateListenerRemove) {
            this.appStateListenerRemove();
            this.appStateListenerRemove = null;
        }

        console.log('🛑 Location tracking stopped');
    }

    /**
     * Listen for app resume (foreground) to immediately sync location.
     * This closes gaps from background pauses.
     */
    private setupAppStateListener() {
        if (this.appStateListenerRemove) return; // Already listening

        App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive && this.debugState.isTracking) {
                console.log('📱 App resumed — immediate location sync');
                // Small delay for GPS to warm up after background
                setTimeout(() => this.logLocation(), 1000);
            }
        }).then(handle => {
            this.appStateListenerRemove = () => handle.remove();
        });
    }

    async getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
        try {
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (capacitorError) {
            // Fallback to browser geolocation API (web)
            if (!navigator.geolocation) {
                console.error('❌ Geolocation not supported');
                return null;
            }

            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.error('❌ Browser Geo Error:', error.code, error.message);
                        resolve(null);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            });
        }
    }

    private async logLocation() {
        if (!this.driverId || !this.companyId) return;

        const loc = await this.getCurrentLocation();
        if (!loc) return;

        await this.syncLocation(loc);
    }

    /**
     * Core sync: write location to Supabase + update driver record.
     * Handles idle detection and adaptive intervals.
     */
    private async syncLocation(loc: { lat: number; lng: number; accuracy: number }) {
        if (!this.driverId || !this.companyId) return;

        this.lastSyncTime = Date.now();
        this.debugState.lastAttempt = new Date().toISOString();

        let isIdle = false;

        // Idle detection (Haversine)
        if (this.lastPosition) {
            const dist = this.calculateDistance(
                this.lastPosition.lat, this.lastPosition.lng,
                loc.lat, loc.lng
            );
            if (dist < IDLE_THRESHOLD_METERS) {
                isIdle = true;
                if (!this.idleSince) this.idleSince = Date.now();
            } else {
                isIdle = false;
                this.idleSince = null;
                this.lastPosition = { lat: loc.lat, lng: loc.lng };
            }
        } else {
            this.lastPosition = { lat: loc.lat, lng: loc.lng };
        }

        // Adaptive interval: slow down when idle, speed up when moving
        const newInterval = isIdle ? INTERVAL_IDLE : INTERVAL_MOVING;
        if (newInterval !== this.currentInterval && this.debugState.trackingMode === 'interval') {
            this.currentInterval = newInterval;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = setInterval(() => this.logLocation(), this.currentInterval);
            }
            console.log(`⏱️ Tracking interval: ${this.currentInterval / 1000}s (${isIdle ? 'idle' : 'moving'})`);
        }

        // Insert location history (for playback/audit trail)
        await this.supabaseClient.from('driver_locations').insert({
            driver_id: this.driverId,
            company_id: this.companyId,
            latitude: loc.lat,
            longitude: loc.lng,
            accuracy: loc.accuracy,
            timestamp: new Date().toISOString()
        });

        // Update driver live position
        const updates: Record<string, any> = {
            current_lat: loc.lat,
            current_lng: loc.lng,
            last_location_update: new Date().toISOString(),
            is_online: true,
            status: 'active',
            idle_since: (this.idleSince && isIdle) ? new Date(this.idleSince).toISOString() : null
        };

        // Battery level
        try {
            const battery = await Device.getBatteryInfo();
            if (battery?.batteryLevel !== undefined) {
                updates.battery_level = Math.round(battery.batteryLevel * 100);
            }
        } catch { /* Ignore on web */ }

        const { error } = await this.supabaseClient.from('drivers').update(updates).eq('id', this.driverId);

        if (error) {
            console.error('❌ Location sync failed:', error.message);
            this.debugState.lastStatus = 'error';
            this.debugState.lastError = error.message;
        } else {
            this.debugState.lastStatus = 'success';
            this.debugState.lastError = null;
        }

        this.debugState.lastLocation = loc;
        this.debugState.driverId = this.driverId;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

export const geoService = new GeoService();
