import { CalendarClock, CreditCard, Gauge, Lock, Rocket, Wallet } from 'lucide-react'

const FEATURES = [
  {
    icon: CalendarClock,
    title: 'Duration-based, not credits',
    body: 'Pick 3 days, 7 days, 15 days or a month. Your access is time-based — build as much as you want while it is active.',
  },
  {
    icon: Wallet,
    title: 'Predictable cost',
    body: 'No surprise top-ups at the end of the month. One price, one clear expiry date, zero credit math.',
  },
  {
    icon: Rocket,
    title: 'Ship faster',
    body: 'Send prompts from the side panel right inside lovable.dev. Attach images, iterate, and keep flow.',
  },
  {
    icon: Lock,
    title: 'Secure activation',
    body: 'Each key is bound to your device and validated against your account. No sharing, no leaks.',
  },
  {
    icon: Gauge,
    title: 'Stable & reliable',
    body: 'Behaves like a premium tool — resilient connection and clean prompt delivery every time.',
  },
  {
    icon: CreditCard,
    title: 'Instant delivery',
    body: 'Buy a plan and receive your license key immediately in your dashboard. Activate in seconds.',
  },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">Why Unlimited Lovable</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            Building on Lovable now means stress-free
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            It is not just an extension — it is a calmer way to work. Focus on what you are
            building, not on the credit counter.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/40"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background transition-colors group-hover:border-brand/40">
                <f.icon className="h-5 w-5 text-brand" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
