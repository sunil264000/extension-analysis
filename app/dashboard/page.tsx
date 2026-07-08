'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  getCustomerProfile,
  getMyLicenses,
  getMyPayments,
} from '@/app/actions/customer'
import { License, Payment, Customer } from '@/lib/db/schema'
import { Copy, Download } from 'lucide-react'

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
    return <div className="text-center py-8">Loading your dashboard...</div>
  }

  const activeLicenses = licenses.filter((l) => l.status === 'active').length
  const completedPayments = payments.filter(
    (p) => p.status === 'completed' || p.status === 'success'
  ).length

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-bold text-lg">
              Lovable Infinity
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/shop" className="text-sm hover:text-primary">
                Buy License
              </Link>
              <span className="text-sm text-muted-foreground">{customer?.email}</span>
              <form action="/api/auth/sign-out" method="POST">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Active Licenses</h3>
            <p className="text-3xl font-bold mt-2">{activeLicenses}</p>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Completed Purchases</h3>
            <p className="text-3xl font-bold mt-2">{completedPayments}</p>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Spent</h3>
            <p className="text-3xl font-bold mt-2">
              ₹{parseFloat(customer?.totalSpent.toString() || '0').toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Licenses Section */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Licenses</h2>
              <Link
                href="/shop"
                className="text-sm px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Buy License
              </Link>
            </div>
            <div className="divide-y">
              {licenses.length > 0 ? (
                licenses.map((license) => (
                  <div key={license.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-mono text-sm font-semibold">{license.licenseKey}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(license.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          license.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {license.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          copyToClipboard(license.licenseKey, `license-${license.id}`)
                        }
                        className="text-xs px-2 py-1 rounded border hover:bg-accent transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copied === `license-${license.id}` ? 'Copied!' : 'Copy'}
                      </button>
                      <Link
                        href={`/dashboard/license/${license.id}`}
                        className="text-xs px-2 py-1 rounded border hover:bg-accent transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No licenses yet. Buy one to get started!
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Payment History</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <div key={payment.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          ₹{parseFloat(payment.amount.toString()).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Gateway: {payment.paymentGateway}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          payment.status === 'completed' || payment.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No payments yet
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
