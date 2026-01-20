'use client'

import { MapPin, Truck, Smartphone, BarChart3, Users, Zap, ShieldCheck, Globe } from 'lucide-react'

const features = [
    {
        icon: MapPin,
        title: 'AI Order Parsing',
        description: 'Simply paste your orders or upload a file. Our AI automatically extracts addresses, names, and details instantly.'
    },
    {
        icon: Zap,
        title: 'AI Route Optimization',
        description: 'Auto-calculate the most efficient routes in seconds. Save hours of planning and reduce fuel costs by up to 20%.'
    },
    {
        icon: Users,
        title: 'Smart Assignment',
        description: 'Drag and drop unassigned orders, or let our AI automatically distribute them to the nearest available driver.'
    },
    {
        icon: Smartphone,
        title: 'Driver Mobile App',
        description: 'Give drivers a powerful tool in their pocket. Real-time navigation, proof of delivery, and instant status updates.'
    },
    {
        icon: Truck,
        title: 'Live Fleet Tracking',
        description: 'Know exactly where your drivers are at all times. Real-time GPS tracking on an interactive map.'
    },
    {
        icon: Globe,
        title: 'Real-time Updates',
        description: 'Keep everyone in the loop. Dispatchers see updates instantly, and customers can track their deliveries.'
    },
    {
        icon: ShieldCheck,
        title: 'Proof of Delivery',
        description: 'Capture photos, signatures, and notes at the doorstep. Eliminate disputes and keep customers happy.'
    },
    {
        icon: BarChart3,
        title: 'Analytics & Reports',
        description: 'Deep dive into performance metrics. Track on-time delivery rates, driver efficiency, and order volumes.'
    }
]

export function FeaturesGrid() {
    return (
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase text-sm mb-3">Powerful Features</h2>
                    <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Everything needed to run a modern fleet
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Built for logistics companies who want to stop micromanaging and start growing.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-950 p-6 lg:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-slate-900 border border-slate-100 dark:border-slate-800 hover:-translate-y-2 transition-all duration-300 group h-full flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                <feature.icon size={32} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                {feature.title}
                            </h4>
                            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 flex-grow">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
