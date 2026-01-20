'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function Navbar() {
    const [activeSection, setActiveSection] = useState('')
    const [isScrolled, setIsScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const pathname = usePathname()
    const lastActiveSection = useRef('')

    useEffect(() => {
        if (pathname !== '/') {
            setActiveSection('')
            return
        }

        const handleScroll = () => {
            const scrollY = window.scrollY
            setIsScrolled(scrollY > 20)

            // Scroll Spy
            const sections = ['features', 'how-it-works', 'pricing', 'contact']
            const scrollPosition = scrollY + 100

            // Explicitly handle top of page
            if (scrollY < 100) {
                if (activeSection !== '') {
                    setActiveSection('')
                    lastActiveSection.current = ''
                    window.history.replaceState(null, '', window.location.pathname)
                }
                return
            }

            let currentSection = ''
            for (const section of sections) {
                const element = document.getElementById(section)
                if (element) {
                    const offsetTop = element.offsetTop
                    const offsetHeight = element.offsetHeight

                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        currentSection = section
                        break
                    }
                }
            }

            if (currentSection !== lastActiveSection.current) {
                lastActiveSection.current = currentSection
                setActiveSection(currentSection)
                if (currentSection) {
                    window.history.replaceState(null, '', `#${currentSection}`)
                }
            }
        }
        window.addEventListener('scroll', handleScroll)

        // Check auth state
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
        })

        return () => window.removeEventListener('scroll', handleScroll)
    }, [activeSection])

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-sm py-2'
            : 'bg-white/50 dark:bg-slate-950/50 backdrop-blur-md py-4'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveSection('') }} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative h-12 w-40 md:h-14 md:w-48">
                            <img src="/logo.png" alt="Raute Logo" className="w-full h-full object-contain object-left group-hover:opacity-80 transition-opacity" />
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {['features', 'how-it-works', 'pricing', 'contact'].map((section) => (
                            <Link
                                key={section}
                                href={`/#${section}`}
                                className={`text-sm font-medium transition-colors ${activeSection === section
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
                                    }`}
                            >
                                {section === 'how-it-works' ? 'How it works' : section.charAt(0).toUpperCase() + section.slice(1)}
                            </Link>
                        ))}
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <Button onClick={() => router.push('/dashboard')} className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                                Go to Dashboard <ArrowRight size={16} className="ml-2" />
                            </Button>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" className="rounded-full text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button className="rounded-full px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
                                        Get Started
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 dark:text-slate-300 hover:text-blue-600 p-2">
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 shadow-xl md:hidden animate-in slide-in-from-top-5">
                    <div className="flex flex-col space-y-4">
                        <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-left py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-slate-700 dark:text-slate-300">
                            Features
                        </Link>
                        <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-left py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-slate-700 dark:text-slate-300">
                            How it works
                        </Link>
                        <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="text-left py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-slate-700 dark:text-slate-300">
                            Pricing
                        </Link>
                        <Link href="/#contact" onClick={() => setMobileMenuOpen(false)} className="text-left py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-slate-700 dark:text-slate-300">
                            Contact
                        </Link>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 grid grid-cols-2 gap-3">
                            {user ? (
                                <Button onClick={() => router.push('/dashboard')} className="col-span-2 w-full bg-blue-600 text-white">
                                    Dashboard
                                </Button>
                            ) : (
                                <>
                                    <Link href="/login" className="w-full">
                                        <Button variant="outline" className="w-full rounded-full">Sign In</Button>
                                    </Link>
                                    <Link href="/signup" className="w-full">
                                        <Button className="w-full rounded-full bg-blue-600 text-white">Get Started</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
