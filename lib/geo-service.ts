import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { supabase as defaultSupabase } from './supabase';
import { toast } from '@/lib/toast-utils';

const LOCATION_TRACKING_INTERVAL = 10000; // 10 seconds (for live testing)
const WATCH_ID_KEY = 'geo_watch_id';

class GeoService {
    private watchId: string | null = null;
    private userId: string | null = null;
    private companyId: string | null = null;
    private driverId: string | null = null;
    private supabaseClient: any = defaultSupabase; // Use authenticated client when available

    public debugState = {
        lastAttempt: null as string | null,
        lastError: null as string | null,
        lastStatus: 'idle', // idle, syncing, success, error
        lastLocation: null as any,
        isTracking: false,
        driverId: null as string | null
    }


    async init(userId: string, authenticatedClient?: any) {
        this.userId = userId;
        // Store authenticated client for RLS-compliant operations
        if (authenticatedClient) {
            this.supabaseClient = authenticatedClient;
        }
        // Fetch driver & company ID
        const { data } = await this.supabaseClient.from('drivers').select('id, company_id').eq('user_id', userId).single();
        if (data) {
            this.driverId = data.id;
            this.companyId = data.company_id;
        }
    }


    async getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
        console.log('🔍 getCurrentLocation() called');
        try {
            // Try Capacitor first (mobile)
            console.log('Trying Capacitor...');
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            console.log('✅ Capacitor success:', position.coords.latitude, position.coords.longitude);
            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (capacitorError) {
            // Fallback to browser geolocation API (web)
            console.log('📍 Capacitor not available, using browser geolocation...');

            if (!navigator.geolocation) {
                console.error('❌ Geolocation not supported by browser');
                toast({ title: 'Location Error', description: 'Location services not supported', type: 'error' });
                return null;
            }

            console.log('Requesting browser location...');
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log('✅ Browser geolocation success:', position.coords.latitude, position.coords.longitude);
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.error('❌ Browser Geo Error:', error.code, error.message);
                        toast({ title: 'Location Error', description: `Error: ${error.message}`, type: 'error' });
                        resolve(null);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            });
        }
    }

    // Start background tracking (simplified for foreground/hybrid implementation)
    // For true background in Prod, we might need a background-runner plugin, 
    // but for now we rely on the app being open or the OS allowing periodic tasks.
    startTracking() {
        if (this.watchId) return;

        console.log("Starting Location Tracking...");

        // Immediate capture
        this.logLocation();

        // Interval capture
        // @ts-ignore
        this.watchId = setInterval(() => {
            this.logLocation();
        }, LOCATION_TRACKING_INTERVAL);
    }

    stopTracking() {
        if (this.watchId) {
            clearInterval(this.watchId as any);
            this.watchId = null;
            console.log("Stopped Location Tracking.");
        }
    }

    private lastPosition: { lat: number; lng: number } | null = null;
    private idleSince: number | null = null;
    private readonly IDLE_THRESHOLD_METERS = 100;

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // metres
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

    private async logLocation() {
        console.log('📝 logLocation() called - driverId:', this.driverId, 'companyId:', this.companyId);

        if (!this.driverId || !this.companyId) {
            console.warn('⚠️ Missing driverId or companyId - skipping location log');
            return;
        }

        const loc = await this.getCurrentLocation();

        if (!loc) {
            console.error('❌ getCurrentLocation returned null - aborting sync');
            return;
        }

        console.log('📍 Got location:', loc);

        let isIdle = false;

        // Check for Idleness
        if (this.lastPosition) {
            const dist = this.calculateDistance(this.lastPosition.lat, this.lastPosition.lng, loc.lat, loc.lng);
            if (dist < this.IDLE_THRESHOLD_METERS) {
                // Not moved enough
                isIdle = true;
                if (!this.idleSince) {
                    this.idleSince = Date.now();
                }
            } else {
                // Moved!
                isIdle = false;
                this.idleSince = null;
                this.lastPosition = { lat: loc.lat, lng: loc.lng };
            }
        } else {
            this.lastPosition = { lat: loc.lat, lng: loc.lng };
        }

        // Insert History (Always logs history for playback)
        await this.supabaseClient.from('driver_locations').insert({
            driver_id: this.driverId,
            company_id: this.companyId,
            latitude: loc.lat,
            longitude: loc.lng,
            accuracy: loc.accuracy,
            timestamp: new Date().toISOString()
        });

        // Update Driver Status (Live Position + Idle Flag + Battery)
        const updates: any = {
            current_lat: loc.lat,
            current_lng: loc.lng,
            last_location_update: new Date().toISOString()
        };

        // Battery Check
        try {
            const battery = await Device.getBatteryInfo();
            if (battery && battery.batteryLevel !== undefined) {
                // Device return 0.0 to 1.0 usually
                updates.battery_level = Math.round(battery.batteryLevel * 100);
            }
        } catch (e) {
            // Ignore battery error on web or unsupported devices
        }

        if (this.idleSince && isIdle) {
            updates.idle_since = new Date(this.idleSince).toISOString();
        } else {
            updates.idle_since = null;
        }

        const { error } = await this.supabaseClient.from('drivers').update(updates).eq('id', this.driverId);
        if (error) {
            console.error('❌ Failed to update driver location:', error);
            this.debugState.lastStatus = 'error';
            this.debugState.lastError = error.message;
        } else {
            this.debugState.lastStatus = 'success';
            this.debugState.lastError = null;
        }

        this.debugState.lastLocation = loc;
        this.debugState.lastAttempt = new Date().toISOString();
        this.debugState.driverId = this.driverId;

        console.log(`Location Synced: ${loc.lat}, ${loc.lng}, Idle: ${isIdle}`);
    }
}

export const geoService = new GeoService();
