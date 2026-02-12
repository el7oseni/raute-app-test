"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase, type CustomField } from "@/lib/supabase"

interface CustomFieldsManagerProps {
    onFieldsChange?: () => void
    entityType?: 'order' | 'driver'
}

export function CustomFieldsManager({ onFieldsChange, entityType = 'order' }: CustomFieldsManagerProps) {
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddFieldOpen, setIsAddFieldOpen] = useState(false)

    useEffect(() => {
        fetchCustomFields()
    }, [entityType])

    async function fetchCustomFields() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!userProfile) return

            const { data, error } = await supabase
                .from('custom_fields')
                .select('*')
                .eq('company_id', userProfile.company_id)
                .eq('entity_type', entityType)
                .order('display_order', { ascending: true })

            if (error) throw error
            setCustomFields(data || [])
        } catch (error) {
            console.error('Error fetching custom fields:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAddField(formData: FormData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!userProfile) return

            const fieldType = formData.get('field_type') as string
            const newField = {
                company_id: userProfile.company_id,
                entity_type: entityType,
                field_name: formData.get('field_name') as string,
                field_type: fieldType,
                field_label: formData.get('field_label') as string,
                placeholder: formData.get('placeholder') as string || null,
                options: fieldType === 'select' ? (formData.get('options') as string).split(',').map(o => o.trim()) : null,
                is_required: formData.get('is_required') === 'on',
                driver_visible: formData.get('driver_visible') === 'on',
                display_order: customFields.length
            }

            const { error } = await supabase.from('custom_fields').insert(newField)
            if (error) throw error


            setIsAddFieldOpen(false)
            await fetchCustomFields()
            onFieldsChange?.()
        } catch (error) {
            console.error('Error adding field:', error)
            alert('Failed to add field')
        }
    }

    async function handleDeleteField(fieldId: string) {
        if (!confirm('Are you sure? This will remove this field from all orders.')) return

        try {
            const { error } = await supabase.from('custom_fields').delete().eq('id', fieldId)
            if (error) throw error
            await fetchCustomFields()
            onFieldsChange?.()
        } catch (error) {
            console.error('Error deleting field:', error)
            alert('Failed to delete field')
        }
    }

    async function toggleDriverVisibility(field: CustomField) {
        try {
            const { error } = await supabase
                .from('custom_fields')
                .update({ driver_visible: !field.driver_visible })
                .eq('id', field.id)

            if (error) throw error
            await fetchCustomFields()
            onFieldsChange?.()
        } catch (error) {
            console.error('Error updating field:', error)
        }
    }

    if (isLoading) {
        return <div className="p-4 space-y-3 h-32 animate-pulse"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /><div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded" /><div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Custom Fields</h3>
                    <p className="text-xs text-slate-500">Define fields that will appear in your order forms</p>
                </div>
                {!isAddFieldOpen && (
                    <Button size="sm" onClick={() => setIsAddFieldOpen(true)} className="gap-2">
                        <Plus size={14} /> Add Field
                    </Button>
                )}
            </div>

            {isAddFieldOpen && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <form onSubmit={(e) => { e.preventDefault(); handleAddField(new FormData(e.currentTarget)) }} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Field Label</label>
                                <Input name="field_label" placeholder="Insurance Type" required className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Field Name</label>
                                <Input name="field_name" placeholder="insurance_type" pattern="[a-z_]+" required className="h-9 text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Type</label>
                                <select name="field_type" className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" required>
                                    <option value="text">Text</option>
                                    <option value="textarea">Long Text</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="select">Dropdown</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Placeholder</label>
                                <Input name="placeholder" placeholder="Enter value..." className="h-9 text-sm" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Options (for dropdown)</label>
                            <Input name="options" placeholder="Option 1, Option 2, Option 3" className="h-9 text-sm" />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="is_required" className="w-4 h-4 rounded" />
                                Required
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="driver_visible" className="w-4 h-4 rounded" />
                                👁️ Visible to Drivers
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" className="flex-1">Create</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => setIsAddFieldOpen(false)}>Cancel</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-2">
                {customFields.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">No custom fields yet</p>
                    </div>
                ) : (
                    customFields.map((field) => (
                        <div key={field.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex items-center gap-3">
                            <GripVertical size={16} className="text-slate-300 cursor-grab" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm text-slate-900">{field.field_label}</h4>
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded">{field.field_type}</span>
                                    {field.is_required && <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded">Required</span>}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{field.field_name}</p>
                            </div>
                            <button
                                onClick={() => toggleDriverVisibility(field)}
                                className={`p-1.5 rounded transition-colors ${field.driver_visible
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                title={field.driver_visible ? 'Visible to drivers' : 'Hidden from drivers'}
                            >
                                {field.driver_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button onClick={() => handleDeleteField(field.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
