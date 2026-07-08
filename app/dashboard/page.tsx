'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getCustomerProfile,
  getMyLicenses,
  getMyPayments,
} from '@/app/actions/customer'
import { License, Payment, Customer } from '@/lib/db/schema'
import {
  CheckCircle2,
  Copy,
  Infinity as InfinityIcon,
  KeyRound,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function daysLeft(expiresAt: Date | string): number {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default function DashboardPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [customerData, licensesData, paymentsData] = await Promise.all([
          getCustomerProfile(),
          getMyLicenses(),
          getMyPayments(),
        ])
        setCustomer(customerData)
        setLicenses(licensesData)
        setPayments(paymentsData)
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

  const activeLicenses = licenses.filter((l) => l.status === 'active').length
  const completedPayments = payments.filter(
    (p) => p.status === 'completed' || p.status === 'success'
  ).length

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
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your license keys and see how much time you have left.
        </p>

        {/* Stat cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={KeyRound} label="Active licenses" value={String(activeLicenses)} />
          <StatCard icon={ShoppingBag} label="Completed purchases" value={String(completedPayments)} />
          <StatCard
            icon={Wallet}
            label="Total spent"
            value={`Tk ${parseFloat(customer?.totalSpent?.toString() || '0').toLocaleString()}`}
          />
        </div>

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
                  const left = daysLeft(license.expiresAt)
                  const isActive = license.status === 'active' && left > 0
                  return (
                    <div key={license.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-semibold">
                            {license.licenseKey}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Expires {new Date(license.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            isActive
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                              : 'border-destructive/40 bg-destructive/10 text-destructive'
                          }`}
                        >
                          {isActive ? `${left} days left` : 'Expired'}
                        </span>
                      </div>

                      {isActive && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-gradient"
                            style={{ width: `${Math.min(100, (left / 30) * 100)}%` }}
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

          {/* Payments */}
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
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
                          Tk {parseFloat(payment.amount.toString()).toLocaleString()}
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
        </div>
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
