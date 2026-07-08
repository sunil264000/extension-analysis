import Link from 'next/link'
import { Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, PLAN_FEATURES } from '@/lib/site-config'

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">Pricing</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            Choose your <span className="text-gradient">license duration</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Pick the preferred duration — your key is delivered instantly to your account.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                plan.featured ? 'border-brand/60 ring-glow' : 'border-border'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3 fill-current" />
                  Best value
                </span>
              )}

              <div className="flex items-center gap-2">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    plan.featured ? 'bg-brand-gradient' : 'border border-border bg-background'
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {plan.emoji}
                  </span>
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold leading-tight">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">Full license key</p>
                </div>
              </div>

              <div className="mt-6">
                <span className="text-xs text-muted-foreground">Only</span>
                <div className="font-display text-4xl font-extrabold">
                  {plan.currency}
                  {plan.price.toLocaleString('en-IN')}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.days}</p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {PLAN_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-brand" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                render={<Link href="/shop" />}
                nativeButton={false}
                className={`mt-6 w-full ${
                  plan.featured
                    ? 'bg-brand-gradient text-white hover:opacity-90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Buy now
              </Button>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 w-fit rounded-full border border-border bg-card px-4 py-2 text-center text-sm text-brand">
          Prices are fixed at the current rate — please do not bargain.
        </p>
      </div>
    </section>
  )
}
