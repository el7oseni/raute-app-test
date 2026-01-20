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
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>

                        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>

                        <p className="text-muted-foreground mb-4">
                            We encountered an unexpected error. This has been logged for investigation.
                        </p>

                        {this.state.error && (
                            <details className="mb-4 text-left">
                                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                    Error Details
                                </summary>
                                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                                    {this.state.error.message}
                                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                                </pre>
                            </details>
                        )}

                        <Button onClick={this.handleReset} className="w-full">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reload Page
                        </Button>

                        <p className="text-xs text-muted-foreground mt-4">
                            If this persists, please contact support.
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
