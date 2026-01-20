'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Loader2, Database } from 'lucide-react'
import { useToast } from '@/components/toast-provider'

export default function SeedPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<string>('')
    const { toast } = useToast()
    const [mikeEmail, setMikeEmail] = useState('')
    const [harveyEmail, setHarveyEmail] = useState('')

    // REAL DATA: LOS ANGELES CLUSTER
    // const DEMO_DRIVERS is not needed in the function scope as it's hardcoded in the insert logic now, 
    // but the ORDERS logic uses DEMO_ORDERS map.

    const DEMO_ORDERS = [
        { customer_name: 'Crypto Arena (Staples)', address: '1111 S Figueroa St', city: 'Los Angeles', state: 'CA', zip_code: '90015', lat: 34.0430, lng: -118.2673 },
        { customer_name: 'Dodger Stadium', address: '1000 Vin Scully Ave', city: 'Los Angeles', state: 'CA', zip_code: '90012', lat: 34.0739, lng: -118.2400 },
        { customer_name: 'The Grove', address: '189 The Grove Dr', city: 'Los Angeles', state: 'CA', zip_code: '90036', lat: 34.0722, lng: -118.3581 },
        { customer_name: 'Santa Monica Pier', address: '200 Santa Monica Pier', city: 'Santa Monica', state: 'CA', zip_code: '90401', lat: 34.0092, lng: -118.4976 },
        { customer_name: 'Griffith Observatory', address: '2800 E Observatory Rd', city: 'Los Angeles', state: 'CA', zip_code: '90027', lat: 34.1184, lng: -118.3004 },
        { customer_name: 'Hollywood Walk of Fame', address: '6901 Hollywood Blvd', city: 'Los Angeles', state: 'CA', zip_code: '90028', lat: 34.1016, lng: -118.3415 },
        { customer_name: 'USC Campus', address: '3551 Trousdale Pkwy', city: 'Los Angeles', state: 'CA', zip_code: '90089', lat: 34.0224, lng: -118.2851 },
        { customer_name: 'Rodeo Drive', address: '328 N Rodeo Dr', city: 'Beverly Hills', state: 'CA', zip_code: '90210', lat: 34.0696, lng: -118.4036 },
        { customer_name: 'Venice Beach Boardwalk', address: '1800 Ocean Front Walk', city: 'Venice', state: 'CA', zip_code: '90291', lat: 33.9850, lng: -118.4695 },
        { customer_name: 'LAX Airport Cargo', address: '1 World Way', city: 'Los Angeles', state: 'CA', zip_code: '90045', lat: 33.9416, lng: -118.4085 },
    ]

    async function handleSeed(clearOnly = false) {
        try {
            const confirmed = confirm('⚠️ WARNING: This will DELETE ALL existing Drivers and Orders for your company. \n\nEnsure you have created the new accounts in Supabase Auth first if you want to link them.\n\nAre you sure?')
            if (!confirmed) return

            setIsLoading(true)
            setStatus('Initializing...')

            // 1. Get Current Admin User
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            const { data: user } = await supabase.from('users').select('company_id').eq('id', session.user.id).single()
            if (!user?.company_id) throw new Error('No company found')

            const company_id = user.company_id

            // 2. Resolve Driver User IDs
            let mikeUserId = null
            let harveyUserId = null

            // Helper to resolve ID (Email or Direct UUID)
            const resolveId = async (input: string) => {
                if (!input) return null
                if (input.includes('@')) {
                    const { data: u } = await supabase.from('users').select('id').eq('email', input).single()
                    return u?.id || null
                }
                // Assume it's a UUID
                return input.trim()
            }

            if (mikeEmail) mikeUserId = await resolveId(mikeEmail)
            if (harveyEmail) harveyUserId = await resolveId(harveyEmail)

            // 3. Wipe Data
            setStatus('Cleaning database...')
            await supabase.from('orders').delete().eq('company_id', company_id)
            await supabase.from('drivers').delete().eq('company_id', company_id)

            // 4. Insert Drivers (Linked if IDs found)
            setStatus('Creating drivers...')
            const driversToInsert = [
                {
                    company_id,
                    name: 'Mike Ross',
                    vehicle_type: 'Cargo Van',
                    phone: '555-0101',
                    status: 'active',
                    default_start_address: 'Downtown LA',
                    default_start_lat: 34.0407,
                    default_start_lng: -118.2468,
                    user_id: mikeUserId // LINKED
                },
                {
                    company_id,
                    name: 'Harvey Specter',
                    vehicle_type: 'Sedan',
                    phone: '555-0102',
                    status: 'active',
                    default_start_address: 'Beverly Hills',
                    default_start_lat: 34.0736,
                    default_start_lng: -118.4004,
                    user_id: harveyUserId // LINKED
                },
                {
                    company_id,
                    name: 'Louis Litt',
                    vehicle_type: 'Box Truck',
                    phone: '555-0103',
                    status: 'inactive', // Inactive
                    default_start_address: 'Santa Monica',
                    default_start_lat: 34.0195,
                    default_start_lng: -118.4912,
                    user_id: null
                }
            ]

            const { error: driverError } = await supabase.from('drivers').insert(driversToInsert)
            if (driverError) throw driverError

            // 5. Insert Orders (SKIPPED FOR CLEAR ONLY)
            if (!clearOnly) {
                setStatus('Creating orders...')
                const { error: orderError } = await supabase.from('orders').insert(
                    DEMO_ORDERS.map((o, idx) => ({
                        company_id,
                        order_number: `ORD-LA-${100 + idx}`,
                        customer_name: o.customer_name,
                        address: o.address,
                        city: o.city,
                        state: o.state,
                        zip_code: o.zip_code,
                        phone: '555-9999',
                        status: 'pending',
                        latitude: o.lat,
                        longitude: o.lng,
                        time_window_start: idx % 3 === 0 ? '09:00:00' : null,
                        time_window_end: idx % 3 === 0 ? '12:00:00' : null,
                    }))
                )
                if (orderError) throw orderError
                setStatus('Done!')
                toast({ title: 'Success', description: 'Database seeded & Accounts Linked! 🚀', type: 'success' })
            } else {
                setStatus('Cleared!')
                toast({ title: 'Clean Slate', description: 'All data has been deleted. Ready for fresh start.', type: 'info' })
            }

        } catch (error: any) {
            toast({ title: 'Error', description: error.message, type: 'error' })
            setStatus('Failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto max-w-lg pt-20 p-4">
            <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <AlertTriangle size={24} />
                        <h1 className="text-xl font-bold">Reseed Database (Clean Slate)</h1>
                    </div>
                    <CardTitle>Management Tools</CardTitle>
                    <CardDescription>
                        Manage your testing data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-white rounded-lg border text-sm space-y-2">
                        <p className="font-semibold">Instructions:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                            <li><strong>Factory Reset:</strong> Deletes ALL drivers and orders. Returns app to "First Install" state.</li>
                            <li><strong>Load Real Data:</strong> Resets and loads the USA Demo Data.</li>
                        </ol>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500">Link "Mike Ross" (Optional)</label>
                            <input
                                type="email"
                                placeholder="Enter email for Mike..."
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={mikeEmail}
                                onChange={(e) => setMikeEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            onClick={() => handleSeed(true)}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-12 border-red-500 text-red-600 hover:bg-red-50"
                        >
                            <Database className="mr-2 h-4 w-4" /> Clear Data Only
                        </Button>

                        <Button
                            onClick={() => handleSeed(false)}
                            disabled={isLoading}
                            variant="destructive"
                            className="w-full h-12"
                        >
                            {isLoading ? (
                                <><Loader2 className="animate-spin mr-2" /> Working...</>
                            ) : (
                                <><Database className="mr-2" /> Load Demo Data</>
                            )}
                        </Button>
                    </div>

                    {status === 'Done!' && (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-medium animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle2 size={18} />
                            <span>Data loaded & linked!</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
