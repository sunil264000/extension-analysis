import Link from 'next/link'
import { ArrowRight, Download, Infinity as InfinityIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site-config'

export function CtaBanner() {
  return (
    <section className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="hero-glow relative overflow-hidden rounded-3xl border border-brand/40 bg-card px-6 py-14 text-center">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-balance font-display text-3xl font-bold md:text-4xl">
              Ready to build without limits?
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Grab a license, load the extension, and send your first unlimited prompt today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-brand-gradient text-white hover:opacity-90">
                <Link href="/shop">
                  Get your license
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={SITE.extensionDownload} download>
                  <Download className="mr-1 h-4 w-4" />
                  Download extension
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
            <InfinityIcon className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-display text-sm font-bold">
            Lovable <span className="text-gradient">Infinity</span>
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{SITE.extensionVersion}</span>
        </div>

        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
          <Link href="/shop" className="hover:text-foreground">Shop</Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
