'use client'

import { useEffect, useState } from 'react'
import { getAllPayments } from '@/app/actions/admin'
import { Payment } from '@/lib/db/schema'

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await getAllPayments()
        setPayments(data)
      } catch (error) {
        console.error('Failed to fetch payments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Loading payments...</div>
  }

  const stats = {
    completed: payments
      .filter((p) => p.status === 'completed' || p.status === 'success')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    pending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    failed: payments.filter((p) => p.status === 'failed').length,
  }

  const filteredPayments =
    filter === 'all'
      ? payments
      : filter === 'revenue'
        ? payments.filter((p) => p.status === 'completed' || p.status === 'success')
        : payments.filter((p) => p.status === filter)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments Management</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Completed Revenue</div>
          <div className="text-2xl font-bold mt-1">₹{stats.completed.toLocaleString()}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Pending Amount</div>
          <div className="text-2xl font-bold mt-1">₹{stats.pending.toLocaleString()}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Failed Transactions</div>
          <div className="text-2xl font-bold mt-1">{stats.failed}</div>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'revenue', 'pending', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border hover:bg-accent'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Transaction ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Gateway</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="border-t hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono">
                  {payment.transactionId || payment.id}
                </td>
                <td className="px-6 py-4 text-sm">
                  ₹{parseFloat(payment.amount.toString()).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">{payment.paymentGateway}</td>
                <td className="px-6 py-4 text-sm">
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
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(payment.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="px-6 py-8 text-center text-muted-foreground">
            No payments found
          </div>
        )}
      </div>
    </div>
  )
}
