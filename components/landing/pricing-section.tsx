'use client'

import { Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-blue-50 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-50 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase text-sm mb-3">Simple Pricing</h2>
                    <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Transparent plans for every stage
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Start for free, upgrade as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-start">

                    {/* EARLY BIRD */}
                    <div className="relative bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-950 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-xl lg:scale-105 z-10">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg whitespace-nowrap">
                            🎁 Limited Early Bird
                        </div>
                        <div className="text-center mb-6 pt-4">
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pioneer</h4>
                            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-2">$100</div>
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Lifetime License</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> 5 Drivers Included
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> Unlimited Orders
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> Core Features
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> Email Support
                            </li>
                        </ul>
                        <Link href="/login?view=signup">
                            <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-lg shadow-blue-500/20 animate-pulse">
                                Claim Spot Now
                            </Button>
                        </Link>
                        <p className="text-center text-xs text-red-500 font-bold mt-4">Only 87 spots left! 🔥</p>
                    </div>

                    {/* STARTER */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 transition-colors">
                        <div className="text-center mb-6 pt-2">
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Starter</h4>
                            <div className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">$20</div>
                            <span className="text-sm text-slate-500">per month</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> 5 Drivers
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> All Features
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> Standard Support
                            </li>
                        </ul>
                        <Link href="/login?view=signup">
                            <Button variant="outline" className="w-full rounded-full h-11 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold">
                                Get Started
                            </Button>
                        </Link>
                    </div>

                    {/* PROFESSIONAL */}
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-300 transition-colors">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            Most Popular
                        </div>
                        <div className="text-center mb-6 pt-2">
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Professional</h4>
                            <div className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">$69</div>
                            <span className="text-sm text-slate-500">per month</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-purple-500 shrink-0" /> 20 Drivers
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> All Features
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-green-500 shrink-0" /> Priority Support
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-purple-500 shrink-0" /> Advanced Analytics
                            </li>
                        </ul>
                        <Link href="/login?view=signup">
                            <Button className="w-full rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold h-11">
                                Choose Pro
                            </Button>
                        </Link>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition-colors opacity-90">
                        <div className="text-center mb-6 pt-2">
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enterprise</h4>
                            <div className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">Custom</div>
                            <span className="text-sm text-slate-500">Contact Sales</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-slate-400 shrink-0" /> Unlimited Drivers
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-slate-400 shrink-0" /> White Labeling
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-slate-400 shrink-0" /> Dedicated Account Mgr
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <Check size={18} className="text-slate-400 shrink-0" /> Custom API Access
                            </li>
                        </ul>
                        <Link href="#contact">
                            <Button variant="ghost" className="w-full rounded-full h-11 font-semibold hover:text-blue-600">
                                Contact Us
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
