'use client'

import { useState } from 'react'
import { load } from '@cashfreepayments/cashfree-js'
import { initiatePayment } from '@/app/actions/customer'
import { Loader2 } from 'lucide-react'

export function CheckoutButton({
  tierId,
  featured,
}: {
  tierId: string
  featured?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true)
    setError(null)
    try {
      const order = await initiatePayment(tierId)
      const cashfree = await load({ mode: order.mode })
      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_self',
      })
    } catch (err) {
      console.error('[v0] Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-opacity disabled:opacity-60 ${
          featured
            ? 'bg-brand-gradient text-white hover:opacity-90'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? 'Opening checkout…' : 'Buy now'}
      </button>
      {error && <p className="mt-2 text-center text-xs text-destructive">{error}</p>}
    </div>
  )
}
