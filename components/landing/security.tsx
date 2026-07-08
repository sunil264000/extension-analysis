import { ShieldCheck, Fingerprint, Lock, RefreshCw } from 'lucide-react'

const PILLARS = [
  {
    icon: Fingerprint,
    title: 'Device-bound keys',
    body: 'Every license is cryptographically tied to your machine, so keys can never be shared or leaked.',
  },
  {
    icon: Lock,
    title: 'Encrypted protocol',
    body: 'The extension talks to the server over a signed, encrypted channel — no logic is exposed in the browser.',
  },
  {
    icon: RefreshCw,
    title: 'Live authorization',
    body: 'Access is re-checked on every launch and heartbeat. Revoked or expired keys stop working instantly.',
  },
  {
    icon: ShieldCheck,
    title: 'Tamper-hardened',
    body: 'A self-checking core detects modification and locks itself down to keep your build genuine.',
  },
]

export function Security() {
  return (
    <section id="security" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand">
              Built to be trusted
            </p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
              Enterprise-grade licensing, <span className="text-gradient">by design</span>
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Lovable Infinity is protected by a modern, server-authorized licensing system. Your
              purchase stays yours — secure, private, and always validated against your account.
            </p>

            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-brand/30 bg-card p-5 ring-glow">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient">
                <ShieldCheck className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="font-display font-semibold">Genuine, signed builds only</p>
                <p className="text-sm text-muted-foreground">
                  Every release is signed and verified end to end.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                  <p.icon className="h-5 w-5 text-brand" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
