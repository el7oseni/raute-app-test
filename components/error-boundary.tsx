'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * Global Error Boundary for Planner & Dispatch Pages
 * Prevents UI crashes when Supabase queries fail
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🚨 ErrorBoundary caught an error:', error, errorInfo)

        // Optional: Send to error tracking service
        if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureException(error, { contexts: { react: errorInfo } })
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
            \u003cdiv className = "min-h-screen flex items-center justify-center bg-background p-4"\u003e
            \u003cdiv className = "max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center"\u003e
            \u003cdiv className = "mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4"\u003e
            \u003cAlertTriangle className = "h-8 w-8 text-destructive" /\u003e
            \u003c / div\u003e

            \u003ch2 className = "text-2xl font-bold mb-2"\u003eSomething went wrong\u003c / h2\u003e

            \u003cp className = "text-muted-foreground mb-4"\u003e
                            We encountered an unexpected error.This has been logged for investigation.
            \u003c / p\u003e

            {
                this.state.error && (
                \u003cdetails className = "mb-4 text-left"\u003e
                \u003csummary className = "cursor-pointer text-sm text-muted-foreground hover:text-foreground"\u003e
                                    Error Details
                \u003c / summary\u003e
                \u003cpre className = "mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32"\u003e
                { this.state.error.message }
                { this.state.error.stack && `\n\n${this.state.error.stack}` }
                \u003c / pre\u003e
                \u003c / details\u003e
                        )
            }

            \u003cButton onClick = { this.handleReset } className = "w-full"\u003e
            \u003cRefreshCw className = "mr-2 h-4 w-4" /\u003e
                            Reload Page
            \u003c / Button\u003e

            \u003cp className = "text-xs text-muted-foreground mt-4"\u003e
                            If this persists, please contact support.
            \u003c / p\u003e
            \u003c / div\u003e
            \u003c / div\u003e
            )
        }

        return this.props.children
    }
}
