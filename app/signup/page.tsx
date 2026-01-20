"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Eye, EyeOff, Lock, Mail, User, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/toast-provider"
import { StyledPhoneInput } from "@/components/ui/styled-phone-input"
import { isValidPhoneNumber } from "react-phone-number-input"

export default function SignupPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [phoneValue, setPhoneValue] = useState<string | undefined>('')
    const { toast } = useToast()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const fullName = formData.get("full_name") as string
        const companyName = formData.get("company_name") as string
        const email = formData.get("email") as string
        const phone = phoneValue || formData.get("phone") as string
        const password = formData.get("password") as string

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError("Invalid email format.")
            setIsLoading(false)
            return
        }

        if (phone && !isValidPhoneNumber(phone)) {
            setError("Invalid phone number. Please verify the country code.")
            setIsLoading(false)
            return
        }

        try {
            // 1. Sign up the user
            // 1. Sign up the user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        full_name: fullName,
                        phone: phone
                    }
                }
            })

            if (authError) {
                throw authError
            }
            if (!authData.user) throw new Error("No user returned from signup")

            // 2. Complete Signup via RPC (Safe & Atomic)
            try {
                const { data: rpcData, error: rpcError } = await Promise.race([
                    supabase.rpc('complete_manager_signup', {
                        user_email: email,
                        company_name: companyName,
                        full_name: fullName,
                        user_password: password
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('RPC timeout - profile might still be creating')), 10000)
                    )
                ]) as any

                if (rpcError) {
                    console.warn("RPC Error (non-fatal):", rpcError.message)
                    // Don't throw - user is already created in auth, profile might create via trigger
                }

                if (rpcData && !rpcData.success) {
                    console.warn("RPC returned error:", rpcData.error)
                    // Don't throw - let trigger handle it
                }
            } catch (rpcErr: any) {
                console.warn("RPC failed:", rpcErr.message)
                // Continue anyway - user is created, trigger should handle profile
            }

            // Success! Redirect to email verification page
            // This provides better UX - users know they need to verify email
            window.location.href = "/verify-email"

        } catch (err: any) {
            toast({
                title: "Signup Failed",
                description: err.message || "An unexpected error occurred",
                type: "error"
            })
            setError(err instanceof Error ? err.message : "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="h-screen overflow-y-auto bg-slate-50 flex items-center justify-center p-4 py-8">
            <div className="w-full max-w-md space-y-4 my-auto">
                <div className="text-center space-y-2 mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <path d="M9 17h6" />
                            <circle cx="17" cy="17" r="2" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Get Started</h1>
                    <p className="text-sm text-slate-500">Create a new company account</p>
                </div>

                <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl">Create Account</CardTitle>
                        <CardDescription>
                            Start managing your deliveries today
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="full_name">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="full_name"
                                            name="full_name"
                                            placeholder="John Doe"
                                            type="text"
                                            className="pl-9 h-11"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="company_name">
                                        Company
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="company_name"
                                            name="company_name"
                                            placeholder="Acme Inc."
                                            type="text"
                                            className="pl-9 h-11"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="phone">
                                    Phone Number
                                </label>
                                <StyledPhoneInput
                                    name="phone"
                                    value={phoneValue}
                                    onChange={setPhoneValue}
                                    placeholder="Enter your phone number"
                                    className="h-11"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        className="pl-9 h-11"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        autoCapitalize="none"
                                        autoComplete="new-password"
                                        className="pl-9 pr-9 h-11"
                                        required
                                        minLength={8}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-11 w-11 px-3 py-2 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Must be at least 8 characters
                                </p>
                            </div>

                            <Button className="w-full h-11 text-base mt-2" type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Creating account...
                                    </div>
                                ) : (
                                    "Create Account"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <div className="text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
