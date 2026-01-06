'use client'

import { useEffect, useState } from 'react'
import { supabase, type Driver, type CustomField } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, Truck, Phone, Edit, Trash2, User, Settings, MapPin, Clock, Lock } from 'lucide-react'
import { CustomFieldsManager } from '@/components/custom-fields-manager'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimesheetLedger } from "@/components/timesheet-ledger"

const LocationPicker = dynamic(() => import('@/components/location-picker'), {
    loading: () => <p className="text-xs text-muted-foreground p-2">Loading Map...</p>,
    ssr: false
})
import { StyledPhoneInput } from '@/components/ui/styled-phone-input'
import { isValidPhoneNumber } from 'react-phone-number-input'

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Feature States
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])

    const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
    const [deletingDriver, setDeleteingDriver] = useState<Driver | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Password Management State
    const [isPasswordOpen, setIsPasswordOpen] = useState(false)
    const [passDriver, setPassDriver] = useState<Driver | null>(null)
    const [isUpdatePassLoading, setIsUpdatePassLoading] = useState(false)

    // Location State for Add Form
    const [defaultStartLoc, setDefaultStartLoc] = useState<{ lat: number, lng: number } | null>(null)
    const [phoneValue, setPhoneValue] = useState<string | undefined>('')
    const [editPhoneValue, setEditPhoneValue] = useState<string | undefined>('')
    const [hubs, setHubs] = useState<{ id: string, name: string, address: string, latitude: number, longitude: number }[]>([])
    const [selectedHubId, setSelectedHubId] = useState<string>("")
    const [locationMode, setLocationMode] = useState<'hub' | 'custom'>('hub')

    useEffect(() => {
        fetchDrivers()
        fetchCustomFields()
        fetchHubs()
    }, [])

    async function fetchHubs() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: userProfile } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle()
            if (userProfile?.company_id) {
                const { data } = await supabase.from('hubs').select('*').eq('company_id', userProfile.company_id)
                setHubs(data || [])
            }
        } catch (error) {
            console.error('Error fetching hubs:', error)
        }
    }

    useEffect(() => {
        filterDrivers()
    }, [drivers, searchQuery])

    useEffect(() => {
        if (editingDriver) {
            setEditPhoneValue(editingDriver.phone || '')
        }
    }, [editingDriver])

    function filterDrivers() {
        let filtered = [...drivers]

        if (searchQuery) {
            filtered = filtered.filter(driver =>
                driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (driver.phone && driver.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (driver.vehicle_type && driver.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        }

        setFilteredDrivers(filtered)
    }

    async function fetchCustomFields() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!userProfile) return

            const { data } = await supabase
                .from('custom_fields')
                .select('*')
                .eq('company_id', userProfile.company_id)
                .eq('entity_type', 'driver')
                .order('display_order', { ascending: true })

            setCustomFields(data || [])
        } catch (error) {
            console.error('Error fetching custom fields:', error)
        }
    }

    async function fetchDrivers() {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!userProfile) return

            const { data, error } = await supabase
                .from('drivers')
                .select('*')
                .eq('company_id', userProfile.company_id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setDrivers(data || [])
        } catch (error) {
            console.error('Error fetching drivers:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAddDriver(formData: FormData) {
        try {
            const name = formData.get('name') as string
            const phone = phoneValue || formData.get('phone') as string
            const vehicleType = formData.get('vehicle_type') as string
            const email = formData.get('email') as string
            const password = formData.get('password') as string

            if (!email || !password) {
                alert('Email and Password are required')
                return
            }

            // Email Regex Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                alert('❌ Invalid Email Address.\nPlease check the format (e.g., driver@company.com)')
                return
            }

            // Phone Validation
            if (phone && !isValidPhoneNumber(phone)) {
                alert('❌ Invalid Phone Number.\nPlease select the country flag and enter a valid number.')
                return
            }

            // Collect Custom Values
            const customValues: Record<string, any> = {}
            customFields.forEach(field => {
                const value = formData.get(`custom_${field.id}`)
                if (value) customValues[field.id] = value
            })

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .maybeSingle()

            if (!userProfile) return

            const defaultStartAddress = formData.get('default_start_address') as string
            const defaultStartLat = formData.get('default_start_lat') ? parseFloat(formData.get('default_start_lat') as string) : null
            const defaultStartLng = formData.get('default_start_lng') ? parseFloat(formData.get('default_start_lng') as string) : null

            // Call Server-Side API Route
            // Call Server-Side API Route
            console.log("🚀 Sending Request to /api/create-driver...")
            const payload = {
                name,
                email,
                phone,
                vehicleType,
                companyId: userProfile.company_id,
                customValues,
                defaultStartAddress,
                defaultStartLat,
                defaultStartLng,
                password // Ensure password is sent!
            }
            console.log("📦 Payload:", JSON.stringify(payload, null, 2))

            const response = await fetch('/api/create-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const result = await response.json()
            console.log("📩 API Response:", result)

            if (!response.ok) {
                console.error("❌ API Error:", result)
                alert(`Failed to create driver: ${result.error || result.details || 'Unknown error'}`)
                return
            }

            // Success!
            alert(`✅ Driver account created successfully!\n\nEmail: ${result.credentials.email}\nPassword: ${result.credentials.password}\n\nPlease save these credentials.`)
            setIsAddDriverOpen(false)
            setPhoneValue(undefined)
            setDefaultStartLoc(null)
            setSelectedHubId("")
            setLocationMode('hub')
            fetchDrivers()
        } catch (error: any) {
            console.error('🔥 CRITICAL ERROR adding driver:', error)
            alert(`Critical Error: ${error.message || 'Check console for details'}`)
        }
    }

    async function handleUpdatePassword(formData: FormData) {
        if (!passDriver) return
        setIsUpdatePassLoading(true)

        try {
            const newPassword = formData.get('new_password') as string

            const res = await fetch('/api/update-driver-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: passDriver.id,
                    newPassword
                })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to update password')

            alert('✅ Password updated successfully!')
            setIsPasswordOpen(false)
            setPassDriver(null)
        } catch (error: any) {
            console.error(error)
            alert(`❌ Error: ${error.message}`)
        } finally {
            setIsUpdatePassLoading(false)
        }
    }

    async function handleEditDriver(formData: FormData) {
        if (!editingDriver) return

        try {
            const name = formData.get('name') as string
            const phone = formData.get('phone') as string
            const vehicleType = formData.get('vehicle_type') as string
            const status = formData.get('status') as string

            // Update custom values
            const customValues: Record<string, any> = { ...(editingDriver.custom_values || {}) }
            customFields.forEach(field => {
                const value = formData.get(`custom_${field.id}`)
                if (value) customValues[field.id] = value
            })

            const { error } = await supabase
                .from('drivers')
                .update({
                    name,
                    phone,
                    vehicle_type: vehicleType,
                    status,
                    custom_values: customValues
                })
                .eq('id', editingDriver.id)

            if (error) throw error

            setEditingDriver(null)
            fetchDrivers()
        } catch (error) {
            console.error('Error updating driver:', error)
            alert('Error updating driver')
        }
    }

    async function handleDeleteDriver() {
        if (!deletingDriver) return

        try {
            setIsDeleting(true)

            // Call API to delete driver and associated user account
            const response = await fetch('/api/delete-driver', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: deletingDriver.id,
                    userId: deletingDriver.user_id
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to delete driver')

            setDeleteingDriver(null)
            fetchDrivers()
        } catch (error) {
            console.error('Error deleting driver:', error)
            alert('Error deleting driver')
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4 pb-20 max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-md" />
                </header>
                <div className="relative">
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-card rounded-xl border border-border p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 w-full">
                                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                                    <div className="space-y-2 w-full">
                                        <Skeleton className="h-5 w-40" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4 pb-20 max-w-7xl mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
                    <p className="text-sm text-muted-foreground">Manage your fleet</p>
                </div>
                <div className="flex items-center gap-2">
                    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Settings size={16} />
                                Fields
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>Driver Fields</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4">
                                <CustomFieldsManager
                                    entityType="driver"
                                    onFieldsChange={fetchCustomFields}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Sheet open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
                        <SheetTrigger asChild>
                            <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
                                <Plus size={16} />
                                Add Driver
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
                            <SheetHeader>
                                <SheetTitle>Add New Driver</SheetTitle>
                            </SheetHeader>
                            <form action={handleAddDriver} className="space-y-4 mt-4 pb-40">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input name="name" placeholder="Driver name" required className="bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input name="email" type="email" placeholder="driver@example.com" required className="bg-background" />
                                    <p className="text-xs text-muted-foreground">The driver will use this email to log in</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <PasswordInput name="password" placeholder="Create a secure password" required minLength={6} className="bg-background" />
                                    <p className="text-xs text-muted-foreground">Minimum 6 characters. Share this with the driver.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone</label>
                                    <StyledPhoneInput
                                        name="phone"
                                        value={phoneValue}
                                        onChange={setPhoneValue}
                                        placeholder="Enter phone number"
                                        defaultCountry="US"
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Vehicle Type</label>
                                    <Input name="vehicle_type" placeholder="e.g. Van, Truck, Bike" required className="bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <div className="space-y-3 pt-2 border-t border-border">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <MapPin size={16} /> Default Start Location
                                        </label>

                                        {/* Location Mode Toggle */}
                                        <div className="flex bg-muted p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setLocationMode('hub')}
                                                className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", locationMode === 'hub' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                                            >
                                                🏢 Warehouse
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLocationMode('custom')}
                                                className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-all", locationMode === 'custom' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                                            >
                                                📍 Custom Pin
                                            </button>
                                        </div>

                                        {locationMode === 'hub' ? (
                                            <div className="space-y-3 bg-muted/50 border p-3 rounded-xl">
                                                {hubs.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-xs text-muted-foreground mb-2">No warehouses defined yet.</p>
                                                        <Link href="/settings" className="text-xs font-bold text-primary hover:underline">
                                                            + Add Warehouse in Settings
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Select Warehouse</label>
                                                        <select
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            value={selectedHubId}
                                                            onChange={(e) => {
                                                                const hubId = e.target.value
                                                                setSelectedHubId(hubId)
                                                                const hub = hubs.find(h => h.id === hubId)
                                                                if (hub) {
                                                                    setDefaultStartLoc({ lat: hub.latitude, lng: hub.longitude })
                                                                    // We need to set the address input value visually or hidden
                                                                    // Since inputs are uncontrolled, we key them or set defaultValue
                                                                }
                                                            }}
                                                        >
                                                            <option value="">-- Choose a Hub --</option>
                                                            {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="bg-muted/50 border p-2 rounded-xl">
                                                    <LocationPicker onLocationSelect={(lat, lng) => setDefaultStartLoc({ lat, lng })} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Tap map to pin exact location.</p>
                                            </div>
                                        )}

                                        {/* Hidden/Read-only Inputs for Form Submission */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase">Selected Address</label>
                                            <Input
                                                name="default_start_address"
                                                placeholder="Address will appear here..."
                                                className="bg-muted text-muted-foreground"
                                                readOnly={locationMode === 'hub'}
                                                // Hack to update uncontrolled input when hub selected
                                                key={selectedHubId + (defaultStartLoc?.lat || '')}
                                                defaultValue={locationMode === 'hub' ? hubs.find(h => h.id === selectedHubId)?.address : ''}
                                            />

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-muted-foreground font-bold">Lat</label>
                                                    <Input name="default_start_lat" value={defaultStartLoc?.lat || ''} readOnly className="bg-muted text-xs h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-muted-foreground font-bold">Lng</label>
                                                    <Input name="default_start_lng" value={defaultStartLoc?.lng || ''} readOnly className="bg-muted text-xs h-8" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Pin the exact start location (e.g. parking lot exit) for precise routing.
                                    </p>
                                </div>

                                {/* Custom Fields */}
                                {customFields.length > 0 && (
                                    <div className="border-t border-border pt-4 mt-4 space-y-4">
                                        <h4 className="font-semibold text-sm text-foreground">Additional Info</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {customFields.map((field) => (
                                                <div key={field.id} className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    {field.field_type === 'select' ? (
                                                        <select
                                                            name={`custom_${field.id}`}
                                                            required={field.is_required}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <option value="">Select...</option>
                                                            {field.options?.map((opt: string) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : field.field_type === 'textarea' ? (
                                                        <textarea
                                                            name={`custom_${field.id}`}
                                                            placeholder={field.placeholder || ''}
                                                            required={field.is_required}
                                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        />
                                                    ) : (
                                                        <Input
                                                            type={field.field_type === 'number' ? 'number' : 'text'}
                                                            name={`custom_${field.id}`}
                                                            placeholder={field.placeholder || ''}
                                                            required={field.is_required}
                                                            className="bg-background"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-12 text-lg">Create Driver Account</Button>
                            </form>
                        </SheetContent>
                    </Sheet>
                </div>
            </header >

            {/* Tabs Navigation */}
            <Tabs defaultValue="drivers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="drivers" className="gap-2"><Truck size={14} /> Drivers List</TabsTrigger>
                    <TabsTrigger value="timesheets" className="gap-2"><Clock size={14} /> Timesheets & Ledger</TabsTrigger>
                </TabsList>

                <TabsContent value="drivers" className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search drivers..."
                            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Drivers List */}
                    <div className="space-y-3">
                        {filteredDrivers.length === 0 ? (
                            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                                <Truck className="mx-auto h-12 w-12 mb-2 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">No drivers found</p>
                            </div>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <div
                                    key={driver.id}
                                    className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/50 transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User size={24} className="text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-foreground mb-1">{driver.name}</h3>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    {driver.phone && (
                                                        <p className="flex items-center gap-1.5">
                                                            <Phone size={14} />
                                                            {driver.phone}
                                                        </p>
                                                    )}
                                                    {driver.vehicle_type && (
                                                        <p className="flex items-center gap-1.5">
                                                            <Truck size={14} />
                                                            {driver.vehicle_type}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${driver.status === 'active'
                                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${driver.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`} />
                                                        {driver.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                title="Manage Credentials"
                                                onClick={() => {
                                                    setPassDriver(driver)
                                                    setIsPasswordOpen(true)
                                                }}
                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                                            >
                                                <Lock size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingDriver(driver)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Edit size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                onClick={() => setDeleteingDriver(driver)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="timesheets">
                    <TimesheetLedger />
                </TabsContent>
            </Tabs>

            {/* Edit Driver Sheet */}
            < Sheet open={!!editingDriver
            } onOpenChange={(open) => !open && setEditingDriver(null)}>
                <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-3xl">
                    <SheetHeader>
                        <SheetTitle>Edit Driver</SheetTitle>
                    </SheetHeader>
                    {editingDriver && (
                        <form action={handleEditDriver} className="space-y-4 mt-4 pb-40">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input name="name" defaultValue={editingDriver.name} required className="bg-background" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <StyledPhoneInput
                                    name="phone"
                                    value={editPhoneValue}
                                    onChange={setEditPhoneValue}
                                    placeholder="Enter phone number"
                                    defaultCountry="US"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Vehicle Type</label>
                                <Input name="vehicle_type" defaultValue={editingDriver.vehicle_type || ''} className="bg-background" />
                            </div>

                            {/* Location Editing Section */}
                            <div className="space-y-3 pt-2 border-t border-border">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <MapPin size={16} /> Default Start Location
                                </label>
                                <Input
                                    readOnly
                                    value={editingDriver.default_start_address || "No location set"}
                                    className="bg-muted text-muted-foreground"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    This is the starting point for route optimization. To change it, please recreate the driver profile for now.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <select
                                    name="status"
                                    defaultValue={editingDriver.status}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended (Frozen)</option>
                                </select>
                            </div>

                            {/* Custom Fields Edit */}
                            {customFields.length > 0 && (
                                <div className="border-t border-border pt-4 mt-4 space-y-4">
                                    <h4 className="font-semibold text-sm text-foreground">Additional Info</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        {customFields.map((field) => {
                                            const val = (editingDriver.custom_values as any)?.[field.id] || ''
                                            return (
                                                <div key={field.id} className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">
                                                        {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    {field.field_type === 'select' ? (
                                                        <select
                                                            name={`custom_${field.id}`}
                                                            defaultValue={val}
                                                            required={field.is_required}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <option value="">Select...</option>
                                                            {field.options?.map((opt: string) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : field.field_type === 'textarea' ? (
                                                        <textarea
                                                            name={`custom_${field.id}`}
                                                            defaultValue={val}
                                                            placeholder={field.placeholder || ''}
                                                            required={field.is_required}
                                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        />
                                                    ) : (
                                                        <Input
                                                            type={field.field_type === 'number' ? 'number' : 'text'}
                                                            name={`custom_${field.id}`}
                                                            defaultValue={val}
                                                            placeholder={field.placeholder || ''}
                                                            required={field.is_required}
                                                            className="bg-background"
                                                        />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <Button type="submit" className="w-full h-12">Update Driver</Button>
                        </form>
                    )}
                </SheetContent>
            </Sheet>

            {/* Password Update Dialog */}
            <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Credentials</DialogTitle>
                        <DialogDescription>
                            Update the login password for <strong>{passDriver?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    {passDriver && (
                        <form action={handleUpdatePassword} className="space-y-4">

                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Password</label>
                                <PasswordInput
                                    name="new_password"
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsPasswordOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isUpdatePassLoading}>
                                    {isUpdatePassLoading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingDriver} onOpenChange={(open) => !open && setDeleteingDriver(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Driver?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove {deletingDriver?.name} from your drivers list.
                            All assigned orders will be unassigned.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDriver}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </div>
    )
}
