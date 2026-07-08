'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getCustomerProfile,
  getMyLicenses,
  getMyPayments,
  getMyUsageStats,
  claimTrialLicense,
  getIsAdmin,
  type UsageStats,
} from '@/app/actions/customer'
import { License, Payment, Customer } from '@/lib/db/schema'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Infinity as InfinityIcon,
  KeyRound,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UsageChart } from '@/components/dashboard/usage-chart'

function msLeft(expiresAt: Date | string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now())
}

/** Human label: minutes for <1h, hours for <1d, otherwise days. */
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

export default function DashboardPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Ensure the user has their free trial before loading licenses.
        await claimTrialLicense().catch(() => {})
        const [customerData, licensesData, paymentsData, usageData, adminFlag] =
          await Promise.all([
            getCustomerProfile(),
            getMyLicenses(),
            getMyPayments(),
            getMyUsageStats(30).catch(() => null),
            getIsAdmin().catch(() => false),
          ])
        setCustomer(customerData)
        setLicenses(licensesData)
        setPayments(paymentsData)
        setUsage(usageData)
        setIsAdminUser(adminFlag)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        Loading your dashboard...
      </div>
    )
  }

  const activeLicenses = licenses.filter(
    (l) => l.status === 'active' && msLeft(l.expiresAt) > 0
  ).length
  const hasActive = activeLicenses > 0

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient">
              <InfinityIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Lovable <span className="text-gradient">Infinity</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {customer?.email}
            </span>
            {isAdminUser && (
              <Button
                render={<Link href="/admin" />}
                nativeButton={false}
                size="sm"
                variant="outline"
              >
                Admin
              </Button>
            )}
            <Button
              render={<Link href="/shop" />}
              nativeButton={false}
              size="sm"
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              Buy license
            </Button>
            <form action="/api/auth/sign-out" method="POST">
              <Button type="submit" size="sm" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">
          Welcome back{customer?.email ? `, ${customer.email.split('@')[0]}` : ''}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your usage, manage license keys, and renew before you run out.
        </p>

        {/* Renew / upgrade banner when no active license */}
        {!hasActive && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <p className="font-semibold">No active license right now</p>
                <p className="text-sm text-muted-foreground">
                  Get unlimited prompts again by activating a new plan.
                </p>
              </div>
            </div>
            <Button
              render={<Link href="/shop" />}
              nativeButton={false}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              Renew now
            </Button>
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={KeyRound} label="Active licenses" value={String(activeLicenses)} />
          <StatCard
            icon={Activity}
            label="Prompts today"
            value={String(usage?.promptsToday ?? 0)}
          />
          <StatCard
            icon={Sparkles}
            label="Prompts this week"
            value={String(usage?.promptsThisWeek ?? 0)}
          />
          <StatCard
            icon={Wallet}
            label="Total spent"
            value={`₹${parseFloat(customer?.totalSpent?.toString() || '0').toLocaleString()}`}
          />
        </div>

        {/* Usage graph */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Prompt usage</h2>
              <p className="text-sm text-muted-foreground">
                Prompts you sent through the extension over the last 30 days.
              </p>
            </div>
            <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {usage?.totalPrompts ?? 0} total
            </span>
          </div>
          <div className="p-4">
            {usage && usage.totalPrompts > 0 ? (
              <UsageChart data={usage.daily} />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Activity className="h-8 w-8 opacity-40" />
                <p>No prompt activity yet.</p>
                <p className="text-xs">
                  Install the extension and start building — your usage will show up here.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Licenses */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Your licenses</h2>
              <Button render={<Link href="/shop" />} nativeButton={false} size="sm" variant="ghost">
                Buy more
              </Button>
            </div>
            <div className="divide-y divide-border">
              {licenses.length > 0 ? (
                licenses.map((license) => {
                  const ms = msLeft(license.expiresAt)
                  const isActive = license.status === 'active' && ms > 0
                  const isTrial = license.tierId === 'trial-15min'
                  const totalMs = isTrial
                    ? 15 * 60 * 1000
                    : 30 * 24 * 60 * 60 * 1000
                  const pct = Math.min(100, (ms / totalMs) * 100)
                  return (
                    <div key={license.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-mono text-sm font-semibold">
                              {license.licenseKey}
                            </p>
                            {isTrial && (
                              <span className="shrink-0 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                                Trial
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expires {new Date(license.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            isActive
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                              : 'border-destructive/40 bg-destructive/10 text-destructive'
                          }`}
                        >
                          {isActive ? timeLeftLabel(license.expiresAt) : 'Expired'}
                        </span>
                      </div>

                      {isActive && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-gradient"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(license.licenseKey, `license-${license.id}`)}
                        >
                          {copied === `license-${license.id}` ? (
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="mr-1 h-3.5 w-3.5" />
                          )}
                          {copied === `license-${license.id}` ? 'Copied' : 'Copy key'}
                        </Button>
                        {!isActive && (
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
                        <Button
                          render={<Link href={`/dashboard/license/${license.id}`} />}
                          nativeButton={false}
                          size="sm"
                          variant="ghost"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No licenses yet.{' '}
                  <Link href="/shop" className="text-brand underline-offset-4 hover:underline">
                    Buy one to get started
                  </Link>
                  .
                </div>
              )}
            </div>
          </section>

          {/* Recent activity */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Recent activity</h2>
              {usage && usage.flaggedCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
                  <AlertTriangle className="h-3 w-3" />
                  {usage.flaggedCount} flagged
                </span>
              )}
            </div>
            <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {usage && usage.recent.length > 0 ? (
                usage.recent.map((event) => (
                  <div key={event.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm">
                        {event.promptText
                          ? event.promptText
                          : `Prompt (${event.promptLength} chars)`}
                      </p>
                      {event.flagged && (
                        <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-500">
                          Flagged
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                      {event.projectId ? ` · ${event.projectId}` : ''}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No prompt activity yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Payments */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Payment history</h2>
          </div>
          <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
            {payments.length > 0 ? (
              payments.map((payment) => {
                const done =
                  payment.status === 'completed' || payment.status === 'success'
                return (
                  <div key={payment.id} className="flex items-start justify-between p-5">
                    <div>
                      <p className="font-semibold">
                        ₹{parseFloat(payment.amount.toString()).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()} ·{' '}
                        {payment.paymentGateway}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : payment.status === 'pending'
                            ? 'border-brand/40 bg-brand/10 text-brand'
                            : 'border-destructive/40 bg-destructive/10 text-destructive'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No payments yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-brand" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
    </div>
  )
}
