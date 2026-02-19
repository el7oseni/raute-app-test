'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, RefreshCw, AlertCircle, Send, CheckCircle2 } from "lucide-react"
import { markIntentionalLogout } from "@/components/auth-check"

export default function VerifyEmailPage() {
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    // On mount: get user email and auto-redirect if already verified
    useEffect(() => {
        async function checkOnMount() {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user?.email) {
                setUserEmail(data.session.user.email)
            } else {
                // Supabase doesn't create a session until email is verified,
                // so fall back to the email saved in sessionStorage during signup
                const saved = sessionStorage.getItem('pending_verification_email')
                if (saved) setUserEmail(saved)
            }
            // If email is already verified, skip this page entirely
            if (data.session?.user?.email_confirmed_at) {
                window.location.href = '/dashboard'
            }
        }
        checkOnMount()
    }, [])

    async function handleCheckVerification() {
        setIsChecking(true)
        setError(null)
        setSuccess(null)

        try {
            // Step 1: Check if there's already a session (cheap, never throws)
            const { data: sessionData } = await supabase.auth.getSession()

            if (sessionData.session?.user?.email_confirmed_at) {
                // Already verified and signed in — go to dashboard
                sessionStorage.removeItem('pending_verification_email')
                window.location.href = '/dashboard'
                return
            }

            if (!sessionData.session) {
                // No session at all. This happens when:
                //   - Supabase hasn't verified the email yet (user hasn't clicked link)
                //   - The email WAS verified in another tab/browser, which signs them in there,
                //     but this tab still has no session → send to login
                router.push('/login?message=verified')
                return
            }

            // Step 2: Has a session but email_confirmed_at is null — try refreshing
            // to pick up any verification that happened after the session was created
            const { data, error: refreshError } = await supabase.auth.refreshSession()

            if (refreshError || !data.session) {
                setError("Could not check verification status. Please try again.")
                setIsChecking(false)
                return
            }

            if (data.session.user.email_confirmed_at) {
                sessionStorage.removeItem('pending_verification_email')
                window.location.href = '/dashboard'
            } else {
                setError("Email not verified yet. Please check your inbox and click the verification link first.")
                setIsChecking(false)
            }
        } catch {
            setError("Something went wrong. Please try again.")
            setIsChecking(false)
        }
    }

    async function handleResendEmail() {
        setIsResending(true)
        setError(null)
        setSuccess(null)

        try {
            // Get the email from session, state, or sessionStorage fallback
            let email = userEmail
            if (!email) {
                const { data } = await supabase.auth.getSession()
                email = data.session?.user?.email || null
                if (!email) {
                    email = sessionStorage.getItem('pending_verification_email')
                }
                if (email) setUserEmail(email)
            }

            if (!email) {
                setError("No email found. Please go back to login and try again.")
                setIsResending(false)
                return
            }

            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            })

            if (resendError) {
                // Handle rate limiting
                if (resendError.message.includes('rate') || resendError.message.includes('limit') || resendError.status === 429) {
                    setError("Please wait a moment before requesting another email.")
                } else {
                    setError(resendError.message)
                }
            } else {
                setSuccess("Verification email sent! Please check your inbox (and spam folder).")
            }
        } catch {
            setError("Failed to resend email. Please try again.")
        } finally {
            setIsResending(false)
        }
    }

    async function handleLogout() {
        markIntentionalLogout()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Mail size={32} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
                    <p className="text-muted-foreground">
                        We sent a verification link to{' '}
                        {userEmail ? <strong>{userEmail}</strong> : 'your email'}. <br />
                        Please click the link to confirm your account.
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2 text-left">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 text-sm p-3 rounded-md flex items-center gap-2 text-left">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        {success}
                    </div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={handleCheckVerification}
                        disabled={isChecking || isResending}
                        className="h-12 border-primary/20 text-primary hover:bg-primary/5"
                    >
                        <RefreshCw size={16} className={`mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? "Checking..." : "I've verified my email"}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleResendEmail}
                        disabled={isResending || isChecking}
                        className="h-12"
                    >
                        <Send size={16} className={`mr-2 ${isResending ? 'animate-pulse' : ''}`} />
                        {isResending ? "Sending..." : "Resend verification email"}
                    </Button>

                    <Button variant="ghost" onClick={handleLogout} className="h-12">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Login
                    </Button>
                </div>
            </div>
        </div>
    )
}
