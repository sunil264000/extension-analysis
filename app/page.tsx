import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { Faq } from '@/components/landing/faq'
import { CtaBanner, SiteFooter } from '@/components/landing/site-footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <CtaBanner />
      </main>
      <SiteFooter />
    </div>
  )
}
