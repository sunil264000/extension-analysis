'use client'

import { useState } from 'react'
import { Payment } from '@/lib/db/schema'

interface PaymentsTableProps {
  payments: (Payment & { customerEmail?: string | null })[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [filter, setFilter] = useState<string>('all')

  const filteredPayments =
    filter === 'all'
      ? payments
      : filter === 'revenue'
        ? payments.filter((p) => p.status === 'completed' || p.status === 'success')
        : payments.filter((p) => p.status === filter)

  return (
    <>
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
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
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
                  {payment.customerEmail || payment.customerId}
                </td>
                <td className="px-6 py-4 text-sm">
                  ₹{parseFloat(payment.amount.toString()).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">{payment.paymentGateway}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      payment.status === 'completed' || payment.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : payment.status === 'pending'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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
    </>
  )
}
