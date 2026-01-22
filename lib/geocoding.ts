/**
 * Geocoding Utility using OpenStreetMap Nominatim API
 * 
 * This utility provides address-to-coordinates conversion (geocoding)
 * using the free OpenStreetMap Nominatim service.
 * 
 * Rate Limit: Max 1 request per second (enforced by Nominatim usage policy)
 * No API key required
 */

export interface GeocodingResult {
    lat: number;
    lng: number;
    displayAddress: string;
}

// Rate limiting: Track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

/**
 * Geocode an address to coordinates using OpenStreetMap Nominatim API
 * 
 * @param address - The address to geocode (e.g., "123 Main St, Los Angeles, CA")
 * @returns Promise with coordinates and formatted address, or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length === 0) {
        console.error('❌ [Geocoding] Empty address provided');
        return null;
    }

    try {
        // Rate limiting: Wait if needed to comply with Nominatim usage policy
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            console.log(`⏳ [Geocoding] Rate limiting: waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        lastRequestTime = Date.now();

        console.log(`🔍 [Geocoding] Searching for address: "${address}"`);

        // Build Nominatim API URL
        const params = new URLSearchParams({
            q: address.trim(),
            format: 'json',
            limit: '1',
            addressdetails: '1'
        });

        const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

        // Make request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'RouteApp/1.0' // Nominatim requires User-Agent header
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`❌ [Geocoding] API request failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn(`⚠️ [Geocoding] No results found for: "${address}"`);
            return null;
        }

        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Build display address from response
        const displayAddress = result.display_name || address;

        console.log(`✅ [Geocoding] Found coordinates: (${lat}, ${lng})`);
        console.log(`📍 [Geocoding] Display address: ${displayAddress}`);

        return {
            lat,
            lng,
            displayAddress
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('❌ [Geocoding] Request timed out');
        } else {
            console.error('❌ [Geocoding] Error:', error.message || error);
        }
        return null;
    }
}

export interface ReverseGeocodeResult {
    address: string;
    city: string;
    state: string;
    zip: string;
    fullAddress: string;
}

/**
 * Reverse geocode coordinates to an address
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with address components, or null if not found
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    if (!lat || !lng) {
        console.error('❌ [Reverse Geocoding] Invalid coordinates provided');
        return null;
    }

    try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        lastRequestTime = Date.now();

        console.log(`🔍 [Reverse Geocoding] Looking up coordinates: (${lat}, ${lng})`);

        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
            addressdetails: '1'
        });

        const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'RouteApp/1.0'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`❌ [Reverse Geocoding] API request failed: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!data || !data.display_name) {
            console.warn(`⚠️ [Reverse Geocoding] No address found for coordinates`);
            return null;
        }

        console.log(`✅ [Reverse Geocoding] Found address: ${data.display_name}`);

        // Extract address components
        const addressData = data.address || {};

        const address = addressData.road || addressData.street || addressData.pedestrian || '';
        const city = addressData.city || addressData.town || addressData.village || addressData.hamlet || '';
        const state = addressData.state || '';
        const zip = addressData.postcode || '';

        return {
            address,
            city,
            state,
            zip,
            fullAddress: data.display_name
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('❌ [Reverse Geocoding] Request timed out');
        } else {
            console.error('❌ [Reverse Geocoding] Error:', error.message || error);
        }
        return null;
    }
}
