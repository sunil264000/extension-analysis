'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  getLicenseWithRelations,
  updateLicenseStatus,
  extendLicense,
  deleteLicense,
  extendSeats,
} from '@/app/actions/admin'

type Detail = Awaited<ReturnType<typeof getLicenseWithRelations>>

const STATUSES = ['active', 'suspended', 'revoked', 'expired'] as const

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'expired':
    case 'revoked':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [data, setData] = useState<Detail>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const result = await getLicenseWithRelations(id)
      if (!result) {
        setNotFound(true)
      } else {
        setData(result)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatus = async (status: string) => {
    setBusy(true)
    setError(null)
    try {
      await updateLicenseStatus(id, status)
      await load()
    } catch (err) {
      setError(`Failed to change status to "${status}". ${err instanceof Error ? err.message : 'Please try again.'}`)
    } finally {
      setBusy(false)
    }
  }

  const handleExtend = async (days: number) => {
    setBusy(true)
    setError(null)
    try {
      await extendLicense(id, days)
      await load()
    } catch (err) {
      setError(`Failed to extend license by ${days} day(s). ${err instanceof Error ? err.message : 'Please try again.'}`)
    } finally {
      setBusy(false)
    }
  }

  const handleExtendSeats = async (seats: number) => {
    setBusy(true)
    setError(null)
    try {
      await extendSeats(id, seats)
      await load()
    } catch (err) {
      setError(`Failed to add seats. ${err instanceof Error ? err.message : 'Please try again.'}`)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this license? This cannot be undone.')) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteLicense(id)
      // Redirect back to licenses list
      window.location.href = '/admin/licenses'
    } catch (err) {
      setError(`Failed to delete license. ${err instanceof Error ? err.message : 'Please try again.'}`)
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading…</div>
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-2xl font-bold">License not found</h1>
        <Link
          href="/admin/licenses"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          ← Back to licenses
        </Link>
      </div>
    )
  }

  const { license, customer, tier } = data
  const expired = new Date(license.expiresAt).getTime() < Date.now()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">License Detail</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {license.licenseKey}
          </p>
        </div>
        <Link
          href="/admin/licenses"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded px-2.5 py-1 text-xs font-semibold ${statusColor(
            license.status
          )}`}
        >
          {license.status}
        </span>
        {expired && (
          <span className="rounded bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
            past expiry
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Customer" value={customer?.email ?? license.customerId} />
        <InfoCard label="Tier" value={tier?.displayName ?? license.tierId} />
        <InfoCard
          label="Issued"
          value={new Date(license.issuedAt).toLocaleString()}
        />
        <InfoCard
          label="Expires"
          value={new Date(license.expiresAt).toLocaleString()}
        />
        <InfoCard label="Seats used" value={String(license.seatsUsed)} />
        <InfoCard label="Usage count" value={String(license.usageCount)} />
        <InfoCard
          label="Bound devices"
          value={String(license.hardwareFingerprints?.length ?? 0)}
        />
        <InfoCard
          label="Price"
          value={tier ? `₹${Number(tier.price).toLocaleString()}` : '—'}
        />
      </div>

      {/* Status management */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Change status</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revoking or suspending instantly blocks the extension on the customer's
          device on its next check.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={busy || license.status === s}
              onClick={() => handleStatus(s)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors disabled:opacity-50 ${
                license.status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Extend */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Extend validity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adds days on top of the current expiry and reactivates the license.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 7, 30, 365].map((d) => (
            <button
              key={d}
              disabled={busy}
              onClick={() => handleExtend(d)}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              +{d} {d === 1 ? 'day' : 'days'}
            </button>
          ))}
        </div>
      </div>

      {/* Extend Seats */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Extend seats</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add more concurrent device seats to this license (currently {license.seatsUsed ?? 0} in use).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 5, 10].map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => handleExtendSeats(s)}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              +{s} {s === 1 ? 'seat' : 'seats'}
            </button>
          ))}
        </div>
      </div>

      {/* Delete */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Danger zone</h2>
        <p className="mt-1 text-sm text-red-800 dark:text-red-300">
          Permanently delete this license key. The customer will lose access immediately on their next check.
        </p>
        <button
          disabled={busy}
          onClick={handleDelete}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Delete license
        </button>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-medium">{value}</div>
    </div>
  )
}
