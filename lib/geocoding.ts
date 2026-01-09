export async function geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return null
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        const response = await fetch(url); const data = await response.json()
        if (data.status === 'OK' && data.results?.[0]) {
            return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng }
        }
        return null
    } catch (e) { console.error(e); return null }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string, city: string, state: string, zip: string } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) throw new Error("Missing Google Maps API Key")
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        const response = await fetch(url); const data = await response.json()
        if (data.status === 'OK' && data.results?.[0]) {
            const result = data.results[0]; const c = result.address_components
            let street = '', route = '', city = '', state = '', zip = ''

            c.forEach((comp: any) => {
                const t = comp.types
                if (t.includes('street_number')) street = comp.long_name
                if (t.includes('route')) route = comp.long_name
                if (t.includes('locality')) city = comp.long_name
                if (!city && t.includes('administrative_area_level_2')) city = comp.long_name
                if (t.includes('administrative_area_level_1')) state = comp.short_name
                if (t.includes('postal_code')) zip = comp.long_name
            })
            return { address: `${street} ${route}`.trim() || result.formatted_address.split(',')[0], city, state, zip }
        }
        if (data.status) throw new Error(`Google API: ${data.status} ${data.error_message || ''}`)
        return null
    } catch (error: any) { console.error(error); throw error }
}
