import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { verifyAndFulfillOrder } from '@/app/actions/customer'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { order_id: orderId } = await searchParams

  let state: 'paid' | 'pending' | 'error' = 'error'
  let licenseKey: string | null = null
  let message = 'We could not find your order.'

  if (orderId) {
    try {
      const result = await verifyAndFulfillOrder(orderId)
      if (result.paid) {
        state = 'paid'
        licenseKey = result.licenseKey
        message = 'Your payment was successful and your license is ready.'
      } else {
        state = 'pending'
        message = `Payment status: ${result.status}. If you completed payment, it may take a moment to confirm.`
      }
    } catch {
      state = 'error'
      message = 'We could not verify this order.'
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        {state === 'paid' && (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
        )}
        {state === 'pending' && <Clock className="mx-auto h-14 w-14 text-amber-400" />}
        {state === 'error' && <XCircle className="mx-auto h-14 w-14 text-destructive" />}

        <h1 className="mt-4 font-display text-2xl font-bold">
          {state === 'paid'
            ? 'Payment successful'
            : state === 'pending'
              ? 'Payment processing'
              : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">{message}</p>

        {licenseKey && (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Your license key
            </p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-foreground">
              {licenseKey}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-gradient px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Go to dashboard
          </Link>
          {state !== 'paid' && (
            <Link
              href="/shop"
              className="rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted"
            >
              Back to plans
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
