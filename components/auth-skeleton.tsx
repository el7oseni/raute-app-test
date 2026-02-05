"use client"

export function AuthSkeleton() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md space-y-8 animate-pulse">
                {/* Logo Skeleton */}
                <div className="text-center space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                </div>

                {/* Card Skeleton */}
                <div className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-lg p-6 space-y-6">
                    {/* Title */}
                    <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-11 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-11 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>

                        {/* Sign In Button */}
                        <div className="h-11 w-full bg-blue-200 dark:bg-blue-900 rounded" />

                        {/* Divider */}
                        <div className="relative my-4">
                            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
                        </div>

                        {/* OAuth Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-11 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-11 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                </div>
            </div>
        </div>
    )
}
