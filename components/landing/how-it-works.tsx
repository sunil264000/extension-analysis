const STEPS = [
  {
    step: '01',
    title: 'Choose a plan',
    body: 'Pick the duration that fits — 3 days, 7 days, 15 days or a month. Pay securely.',
  },
  {
    step: '02',
    title: 'Get your key',
    body: 'Your license key appears instantly in your dashboard right after payment is confirmed.',
  },
  {
    step: '03',
    title: 'Load in Chrome',
    body: 'Download the extension, enable Developer mode, and load it unpacked in seconds.',
  },
  {
    step: '04',
    title: 'Activate & build',
    body: 'Paste your key in the side panel, open lovable.dev, and start sending unlimited prompts.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">Setup</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            First prompt in 5 minutes
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Four simple steps from purchase to your first unlimited prompt.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="relative rounded-2xl border border-border bg-card p-6">
              <span className="font-display text-4xl font-extrabold text-gradient">{s.step}</span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
