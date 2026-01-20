'use client'

import { Truck, Calculator, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-blue-600 dark:text-blue-400 font-bold tracking-wide uppercase text-xs mb-3">Simple Process</h2>
                    <h3 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                        Get started in 3 simple steps
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Launch your optimized fleet operations in under 5 minutes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[28px] left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 -z-10" />

                    {[
                        {
                            icon: CheckCircle2,
                            title: '1. Sign Up Free',
                            desc: 'Create your account in seconds. No credit card required for the trial.'
                        },
                        {
                            icon: Truck,
                            title: '2. Add Drivers',
                            desc: 'Invite your team and assign their vehicles through the dashboard.'
                        },
                        {
                            icon: Calculator,
                            title: '3. Optimize Routes',
                            desc: 'Import orders with AI, click optimize, and watch the magic happen.'
                        }
                    ].map((step, idx) => (
                        <div key={idx} className="relative flex flex-col items-center text-center group">
                            <Link href="/signup" className="cursor-pointer">
                                <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border-4 border-blue-50 dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm mb-6 z-10 group-hover:scale-110 group-hover:border-blue-100 dark:group-hover:border-blue-900 transition-all duration-300">
                                    <step.icon size={26} strokeWidth={2.5} />
                                </div>
                            </Link>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 transition-colors">
                                <Link href="/signup">{step.title}</Link>
                            </h4>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
