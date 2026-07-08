import {
  Bug,
  Wrench,
  ShieldAlert,
  Zap,
  MessageSquare,
  TrendingUp,
  Palette,
  Boxes,
  Search,
  Globe,
  Cloud,
  FileDown,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { icon: Bug, label: 'Bugs', desc: 'Find & fix bugs' },
  { icon: Wrench, label: 'Refactor', desc: 'Clean up code' },
  { icon: ShieldAlert, label: 'Errors', desc: 'Resolve errors' },
  { icon: Zap, label: 'Optimize', desc: 'Boost performance' },
  { icon: MessageSquare, label: 'Comments', desc: 'Document code' },
  { icon: TrendingUp, label: 'SEO', desc: 'Improve ranking' },
  { icon: Palette, label: 'UI', desc: 'Polish design' },
  { icon: Boxes, label: 'Components', desc: 'Split & reuse' },
  { icon: Search, label: 'Review', desc: 'Audit quality' },
]

const ADVANCED = [
  { icon: Globe, label: 'Publish Project', desc: 'Ship your build straight from the panel.' },
  { icon: Cloud, label: 'Enable Lovable Cloud', desc: 'Turn on cloud features in one click.' },
  { icon: FileDown, label: 'Download Source', desc: 'Export your full project source code.' },
]

export function Tools() {
  return (
    <section id="tools" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">In the panel</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            One-click actions that <span className="text-gradient">write the prompt for you</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Nine expert prompts built into the side panel. Tap one and Lovable Infinity sends a
            finely-tuned instruction — no typing, no guesswork.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <div
              key={a.label}
              className="group flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-brand/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background transition-colors group-hover:border-brand/40">
                <a.icon className="h-5 w-5 text-brand" />
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold">{a.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ADVANCED.map((a) => (
            <div
              key={a.label}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient">
                <a.icon className="h-4 w-4 text-white" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold">{a.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
