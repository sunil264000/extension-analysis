'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Monitor,
  Clock,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { getLicenseDetails, type LicenseDetail } from '@/app/actions/customer'

function msLeft(expiresAt: Date | string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

function timeLeftLabel(expiresAt: Date | string): string {
  const ms = msLeft(expiresAt)
  const mins = Math.ceil(ms / (1000 * 60))
  if (mins <= 0) return 'Expired'
  if (mins < 60) return `${mins} min left`
  const hrs = Math.ceil(mins / 60)
  if (hrs < 24) return `${hrs} hr left`
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
  return `${days} day${days === 1 ? '' : 's'} left`
}

export default function LicenseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<LicenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    getLicenseDetails(params.id)
      .then((d) => {
        if (active) setDetail(d)
      })
      .catch((e) => {
        if (active) setError(e?.message || 'Could not load license')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [params.id])

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading license details…
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-lg font-semibold">License not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {error || 'This license does not exist or is not yours.'}
        </p>
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          className="mt-6"
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
      </div>
    )
  }

  const { license, tier, devices, usage } = detail
  const active = license.status === 'active' && msLeft(license.expiresAt) > 0

  const stats = [
    { label: 'Total prompts', value: usage.totalPrompts, icon: Activity },
    { label: 'Prompts today', value: usage.promptsToday, icon: Clock },
    { label: 'Devices', value: devices.length, icon: Monitor },
    { label: 'Flagged', value: usage.flagged, icon: ShieldAlert },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to dashboard
      </Link>

      {/* License header */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tier?.displayName ?? 'License'}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  active
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-destructive/40 bg-destructive/10 text-destructive'
                }`}
              >
                {active ? timeLeftLabel(license.expiresAt) : 'Expired'}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-lg font-semibold">
              {license.licenseKey}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued {new Date(license.issuedAt).toLocaleString()} · Expires{' '}
              {new Date(license.expiresAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => copyKey(license.licenseKey)}>
              {copied ? (
                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="mr-1 h-3.5 w-3.5" />
              )}
              {copied ? 'Copied' : 'Copy key'}
            </Button>
            {!active && (
              <Button
                render={<Link href="/shop" />}
                nativeButton={false}
                size="sm"
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Renew
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Usage chart */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Prompt usage (last 14 days)</h2>
        </div>
        <div className="p-4">
          <UsageChart data={usage.daily} />
        </div>
      </section>

      {/* Bound devices */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">Bound devices</h2>
          <span className="text-xs text-muted-foreground">
            {devices.length} / {tier?.maxSeats ?? 1} seats
          </span>
        </div>
        <div className="divide-y divide-border">
          {devices.length > 0 ? (
            devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-lg border border-border bg-muted p-2">
                    {d.isActive ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{d.hardwareFingerprint}</p>
                    <p className="text-xs text-muted-foreground">
                      Activated {new Date(d.activatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No devices activated yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
