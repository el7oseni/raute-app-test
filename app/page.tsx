'use client'

import { useEffect } from 'react'
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

  /* 
  useEffect(() => {
    // Redirect mobile users (Capacitor) to login page
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      router.push('/login')
    }
  }, [router])
  */

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
