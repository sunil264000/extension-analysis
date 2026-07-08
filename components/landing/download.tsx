import { Download, Check, Globe, Package, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE, CHANGELOG } from '@/lib/site-config'

const INSTALL_STEPS = [
  'Download and unzip the extension package.',
  'Open chrome://extensions and turn on Developer mode.',
  'Click "Load unpacked" and select the unzipped folder.',
  'Open the side panel and paste your license key.',
]

export function DownloadSection() {
  return (
    <section id="download" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">Download</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            Get the latest build
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            The newest release with the full security system and one-click tools built in.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {/* Download card */}
          <div className="ring-glow flex flex-col rounded-3xl border border-brand/40 bg-card p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Latest {SITE.extensionVersion}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Stable
              </span>
            </div>

            <h3 className="mt-6 font-display text-2xl font-bold">
              Unlimited <span className="text-gradient">Lovable</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed, tamper-hardened Chrome extension package.
            </p>

            <dl className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
                <Package className="mx-auto h-4 w-4 text-brand" />
                <dt className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Size</dt>
                <dd className="text-sm font-semibold">{SITE.extensionSize}</dd>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
                <Clock className="mx-auto h-4 w-4 text-brand" />
                <dt className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Updated</dt>
                <dd className="text-sm font-semibold">{SITE.extensionUpdated}</dd>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3 text-center">
                <Globe className="mx-auto h-4 w-4 text-brand" />
                <dt className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Works on</dt>
                <dd className="text-[11px] font-semibold leading-tight">{SITE.browser}</dd>
              </div>
            </dl>

            <Button
              render={<a href={SITE.extensionDownload} download />}
              nativeButton={false}
              size="lg"
              className="mt-6 w-full bg-brand-gradient text-white hover:opacity-90"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download extension ({SITE.extensionSize})
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              A valid license key is required to activate. © 2026 {SITE.owner}.
            </p>
          </div>

          {/* What's new + install */}
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">What&apos;s new in this build</h3>
              <ul className="mt-4 space-y-2.5">
                {CHANGELOG.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-semibold">Install in under a minute</h3>
              <ol className="mt-4 space-y-3">
                {INSTALL_STEPS.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
