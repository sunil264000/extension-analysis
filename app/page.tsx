import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Tools } from '@/components/landing/tools'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Security } from '@/components/landing/security'
import { Pricing } from '@/components/landing/pricing'
import { DownloadSection } from '@/components/landing/download'
import { Faq } from '@/components/landing/faq'
import { CtaBanner, SiteFooter } from '@/components/landing/site-footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Tools />
        <HowItWorks />
        <Security />
        <Pricing />
        <DownloadSection />
        <Faq />
        <CtaBanner />
      </main>
      <SiteFooter />
    </div>
  )
}
