'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getAllCustomers,
  getActiveTiersForAdmin,
  createManualLicense,
} from '@/app/actions/admin'
import type { Customer, LicenseTier } from '@/lib/db/schema'

export default function NewLicensePage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tiers, setTiers] = useState<LicenseTier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ key: string } | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [tierId, setTierId] = useState('')
  const [useCustomDuration, setUseCustomDuration] = useState(false)
  const [customDays, setCustomDays] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [c, t] = await Promise.all([
          getAllCustomers(),
          getActiveTiersForAdmin(),
        ])
        setCustomers(c)
        setTiers(t)
        if (c.length) setCustomerId(c[0].id)
        if (t.length) setTierId(t[0].id)
      } catch (e) {
        setError('Failed to load customers or tiers.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectedTier = tiers.find((t) => t.id === tierId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!customerId || !tierId) {
      setError('Please select a customer and a tier.')
      return
    }
    setSubmitting(true)
    try {
      const override =
        useCustomDuration && customDays ? parseInt(customDays, 10) : undefined
      const license = await createManualLicense({
        customerId,
        tierId,
        durationDaysOverride: override,
      })
      setCreated({ key: license.licenseKey })
    } catch (e: any) {
      setError(e?.message || 'Failed to create license.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
          <h1 className="text-2xl font-bold">License created</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share this key with the customer. It is active immediately.
          </p>
          <div className="mt-4 rounded-lg border bg-background px-4 py-3 font-mono text-sm break-all">
            {created.key}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => navigator.clipboard.writeText(created.key)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Copy key
            </button>
            <Link
              href="/admin/licenses"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Back to licenses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create License</h1>
        <Link
          href="/admin/licenses"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No customers found yet. A customer profile is created automatically when
          a user signs in, so ask the user to sign in first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tier</label>
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} — ₹{Number(t.price).toLocaleString()} ({t.durationDays}d)
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border bg-background/60 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={useCustomDuration}
                onChange={(e) => setUseCustomDuration(e.target.checked)}
              />
              Override duration (days)
            </label>
            {useCustomDuration && (
              <input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder={String(selectedTier?.durationDays ?? 30)}
                className="mt-3 w-full rounded-lg border bg-background px-3 py-2"
              />
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {useCustomDuration
                ? 'The license will expire after this many days.'
                : `Uses the tier duration: ${selectedTier?.durationDays ?? 0} days.`}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create License'}
          </button>
        </form>
      )}
    </div>
  )
}
