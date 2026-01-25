"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/components/toast-provider"

export default function LoginPage() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    // Forgot Password State
    const [isResetMode, setIsResetMode] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [resetSuccess, setResetSuccess] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            // 1. Attempt Standard Supabase Login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            console.log('🔐 Login Response:', { error: authError, hasSession: !!authData.session })

            if (authError) {
                throw authError
            }

            if (!authData.session) {
                throw new Error('No session returned')
            }

            // 2. CRITICAL: Force session refresh to set cookies
            // This ensures the middleware can see the session
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) console.warn('Session refresh warning:', refreshError)

            // 3. Check Email Verification
            const isEmailVerified = authData.session.user.email_confirmed_at

            // 4. Handle Redirection
            if (!isEmailVerified) {
                console.log('📧 Email NOT verified - redirecting to /verify-email')
                router.refresh() // Sync server state
                window.location.href = "/verify-email"
                return
            }

            // Success - Hard Redirect to Dashboard
            console.log('✅ Email verified - redirecting to /dashboard')

            // Force a router refresh first to update server components
            router.refresh()

            // Allow a small delay for cookies to propagate
            await new Promise(resolve => setTimeout(resolve, 500))

            // Use hard navigation to force middleware re-check with new cookies
            window.location.href = "/dashboard"
            return

        } catch (err: any) {
            toast({
                title: "Login Failed",
                description: err.message || "Invalid credentials",
                type: "error"
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsResetting(true)
        setResetSuccess(false)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('reset-email') as string

        try {
            // Supabase Reset Password
            // This sends an email with a link like: SITE_URL/auth/callback?next=/update-password
            // We assume standard callback handling or basic redirection works.
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/update-password`
            })

            if (error) throw error

            setResetSuccess(true)
        } catch (err) {

            setError(err instanceof Error ? err.message : "Failed to send reset link")
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-start sm:items-center justify-center p-4 relative">
            {/* Theme Toggle - Top Right */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md space-y-4">
                <div className="text-center space-y-2 mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
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
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
                    <p className="text-sm text-muted-foreground">Sign in to your Raute account to continue</p>
                </div>

                <Card className="border border-border/50 shadow-xl bg-card transition-all duration-300">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl text-card-foreground">
                            {isResetMode ? "Reset Password" : "Sign in"}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {isResetMode
                                ? "Enter your email to receive a reset link"
                                : "Enter your email and password"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isResetMode ? (
                            // Forgot Password View
                            resetSuccess ? (
                                <div className="text-center space-y-4 animate-in fade-in py-4">
                                    <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-green-700">Email Sent!</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Check your inbox for the password reset link.</p>
                                    </div>
                                    <Button variant="outline" onClick={() => { setIsResetMode(false); setResetSuccess(false); }} className="w-full">
                                        Back to Login
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-4 animate-in slide-in-from-right-4">
                                    {error && (
                                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2 font-medium">
                                            <AlertCircle className="h-4 w-4" />
                                            {error}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="reset-email">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="reset-email"
                                                name="reset-email"
                                                type="email"
                                                placeholder="name@example.com"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button className="w-full" type="submit" disabled={isResetting}>
                                        {isResetting ? "Sending..." : "Send Reset Link"}
                                    </Button>

                                    <Button variant="ghost" type="button" className="w-full gap-2" onClick={() => setIsResetMode(false)}>
                                        <ArrowLeft size={16} /> Back to Login
                                    </Button>
                                </form>
                            )
                        ) : (
                            // Login View
                            <form onSubmit={onSubmit} className="space-y-4 animate-in slide-in-from-left-4">
                                {error && (
                                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2 font-medium">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            placeholder="name@example.com"
                                            type="email"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            autoCorrect="off"
                                            className="pl-9 h-11 bg-background text-foreground border-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium leading-none text-foreground" htmlFor="password">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsResetMode(true)}
                                            className="text-sm font-medium text-primary hover:underline hover:text-primary/80"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            autoCapitalize="none"
                                            autoComplete="current-password"
                                            className="pl-9 pr-9 h-11 bg-background text-foreground border-input"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-11 w-11 px-3 py-2 text-muted-foreground hover:text-foreground"
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
                                </div>
                                <Button className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Signing in...
                                        </div>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>

                                {/* OAuth Divider */}
                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                    </div>
                                </div>

                                {/* OAuth Buttons */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Apple Sign In */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11"
                                        onClick={async () => {
                                            setIsLoading(true)
                                            try {
                                                const { error } = await supabase.auth.signInWithOAuth({
                                                    provider: 'apple',
                                                    options: {
                                                        redirectTo: `${window.location.origin}/auth/callback`
                                                    }
                                                })
                                                if (error) throw error
                                            } catch (err: any) {
                                                toast({
                                                    title: "Sign in failed",
                                                    description: err.message,
                                                    type: "error"
                                                })
                                                setIsLoading(false)
                                            }
                                        }}
                                        disabled={isLoading}
                                    >
                                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                        </svg>
                                        Apple
                                    </Button>

                                    {/* Google Sign In */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11"
                                        onClick={async () => {
                                            setIsLoading(true)
                                            try {
                                                const { error } = await supabase.auth.signInWithOAuth({
                                                    provider: 'google',
                                                    options: {
                                                        redirectTo: `${window.location.origin}/auth/callback`
                                                    }
                                                })
                                                if (error) throw error
                                            } catch (err: any) {
                                                toast({
                                                    title: "Sign in failed",
                                                    description: err.message,
                                                    type: "error"
                                                })
                                                setIsLoading(false)
                                            }
                                        }}
                                        disabled={isLoading}
                                    >
                                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Google
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                    {!isResetMode && (
                        <CardFooter className="flex flex-col gap-4 text-center">
                            <div className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link href="/signup" className="font-semibold text-primary hover:underline hover:text-primary/90">
                                    Sign up
                                </Link>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    )
}
