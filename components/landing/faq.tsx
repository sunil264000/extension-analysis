'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Is this credit-based or duration-based?',
    a: 'Purely duration-based. When you buy a plan you get full access for that period (1, 7, 30 or 365 days). There are no credits to count and no per-prompt charges.',
  },
  {
    q: 'How do I receive my license key?',
    a: 'Instantly. As soon as your payment is confirmed, the key is added to your dashboard. You can copy it and activate the extension right away.',
  },
  {
    q: 'How do I install the extension?',
    a: 'Download the ZIP, extract it, open chrome://extensions, enable Developer mode, and click "Load unpacked" to select the folder. Then paste your key in the side panel.',
  },
  {
    q: 'Can I use one key on multiple devices?',
    a: 'Each key binds to the device it is first activated on. If you need to move devices, contact support and we will help you reset it.',
  },
  {
    q: 'What happens when my license expires?',
    a: 'The extension simply locks until you renew. Your account keeps your history, so renewing takes seconds.',
  },
  {
    q: 'Do you offer support?',
    a: 'Yes — 24/7 support is included with every plan. Reach us on WhatsApp for the fastest response.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">FAQ</p>
          <h2 className="mt-3 text-balance font-display text-3xl font-bold md:text-4xl">
            Questions in mind?
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Everything you need to know before buying or installing.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`faq-content-${i}`}
                  id={`faq-btn-${i}`}
                >
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p
                    id={`faq-content-${i}`}
                    aria-labelledby={`faq-btn-${i}`}
                    role="region"
                    className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
