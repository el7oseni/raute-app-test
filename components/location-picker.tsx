
'use client'

import { useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'

import L from 'leaflet'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

// Fix Leaflet marker icon issue in Next.js
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng])
        },
    })

    return position ? <Marker position={position} icon={icon} /> : null
}

export default function LocationPicker({ onLocationSelect, initialPosition }: { onLocationSelect: (lat: number, lng: number) => void, initialPosition?: { lat: number, lng: number } | null }) {
    // Default to a central location (e.g., LA) implies user should find their spot.
    // In production, we'd use geolocation to center efficiently.
    const [position, setPosition] = useState<[number, number] | null>(initialPosition ? [initialPosition.lat, initialPosition.lng] : null)
    const [isOpen, setIsOpen] = useState(false)

    // Sync state if prop changes (e.g. form reset)
    useEffect(() => {
        if (initialPosition) {
            setPosition([initialPosition.lat, initialPosition.lng])
        } else {
            setPosition(null)
        }
    }, [initialPosition])

    const handleConfirm = () => {
        if (position) {
            onLocationSelect(position[0], position[1])
            setIsOpen(false)
        }
    }

    if (!isOpen) {
        return (
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setIsOpen(true)}
            >
                <MapPin size={16} />
                {position ? "Change Location" : "Pick Location on Map"}
            </Button>
        )
    }

    return (
        <div className="space-y-3 border rounded-xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="h-[300px] w-full relative z-0">
                <MapContainer
                    center={[34.0522, -118.2437]}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>

                {/* Center Indicator (Helper) */}
                <div className="absolute top-2 right-2 z-[400] bg-white/90 p-2 rounded-md text-xs font-semibold shadow-md pointer-events-none">
                    Tap anywhere to pin
                </div>
            </div>

            <div className="p-3 bg-slate-50 flex gap-2 justify-end border-t">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    size="sm"
                    disabled={!position}
                    onClick={handleConfirm}
                >
                    Confirm Location
                </Button>
            </div>
        </div>
    )
}
