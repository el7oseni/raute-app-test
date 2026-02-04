'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/navbar'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesGrid } from '@/components/landing/features-grid'
import { PricingSection } from '@/components/landing/pricing-section'
import { ContactForm } from '@/components/landing/contact-form'
import { Footer } from '@/components/landing/footer'
import { HowItWorks } from '@/components/landing/how-it-works'

export default function LandingPage() {
  const router = useRouter()
  // Default to loading to prevent flash of content on mobile
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect mobile users (Capacitor) to login page
    const checkMobile = async () => {
      let isNative = false
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        // Check if it's actually native platform (iOS/Android) not just web with Capacitor injected
        isNative = (window as any).Capacitor.isNativePlatform?.() ||
          (window as any).Capacitor.getPlatform?.() !== 'web';

        if (isNative) {
          console.log('📱 Native platform detected. Redirecting to login...')
          router.push('/login')
          return // Keep loading true while redirecting
        }
      }

      // Only show content if NOT native
      setIsLoading(false)
    }
    checkMobile()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">Initializing Raute...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

      {/* Navigation */}
      <Navbar />

      <main>
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Features Showcase */}
        <FeaturesGrid />

        {/* 3. How It Works */}
        <HowItWorks />

        {/* 4. Pricing Plans */}
        <PricingSection />

        {/* 5. Contact Form */}
        <ContactForm />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
