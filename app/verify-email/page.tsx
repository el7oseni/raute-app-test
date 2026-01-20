'use client'

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Mail, ArrowLeft, RefreshCw } from "lucide-react"

export default function VerifyEmailPage() {
    const router = useRouter()

    async function handleLogout() {
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
                        We sent a verification link to your email. <br />
                        Please click the link to confirm your account.
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        className="h-12 border-primary/20 text-primary hover:bg-primary/5"
                    >
                        <RefreshCw size={16} className="mr-2" />
                        I've verified my email
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
