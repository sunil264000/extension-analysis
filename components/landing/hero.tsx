import Link from 'next/link'
import { ArrowRight, Download, Infinity as InfinityIcon, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE } from '@/lib/site-config'

const STATS = [
  { icon: InfinityIcon, label: 'Unlimited prompts' },
  { icon: Zap, label: 'No credit anxiety' },
  { icon: ShieldCheck, label: 'Stable & secure' },
]

export function Hero() {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-20 text-center md:pb-24 md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient" />
          Premium Chrome Extension · lovable.dev
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
          Build on Lovable with{' '}
          <span className="text-gradient">unlimited prompts</span>, never out of fear of credits
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Lovable Infinity is a duration-based license, not a credit meter. Activate the
          extension with a key from your account and keep shipping — affordable, secure, and stable.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            render={<Link href="/shop" />}
            nativeButton={false}
            size="lg"
            className="bg-brand-gradient text-white hover:opacity-90"
          >
            Get your license
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button
            render={<a href={SITE.extensionDownload} download />}
            nativeButton={false}
            size="lg"
            variant="outline"
          >
            <Download className="mr-1 h-4 w-4" />
            Download extension
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm text-muted-foreground">
              <s.icon className="h-4 w-4 text-brand" />
              {s.label}
            </div>
          ))}
        </div>

        {/* Preview panel mock */}
        <div className="mx-auto mt-14 max-w-md ring-glow rounded-3xl">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
                  <InfinityIcon className="h-4 w-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold">
                  Lovable Infinity <span className="text-xs text-brand">PRO</span>
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Connected
              </span>
            </div>
            <div className="space-y-4 p-5 text-left">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">1 Month License</p>
                    <p className="text-xs text-muted-foreground">Active · full access</p>
                  </div>
                  <span className="rounded-full border border-brand/40 px-2.5 py-1 text-xs font-medium text-brand">
                    ACTIVE
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Time remaining</span>
                    <span className="font-medium text-foreground">21 days left</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[70%] rounded-full bg-brand-gradient" />
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                No credits. No counters. Just a clean expiry date.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
