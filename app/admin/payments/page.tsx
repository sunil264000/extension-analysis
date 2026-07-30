import { getAllPayments } from '@/app/actions/admin'
import { Payment } from '@/lib/db/schema'
import { PaymentsTable } from '@/components/admin/payments-table'

export default async function PaymentsAdminPage() {
  let payments: (Payment & { customerEmail?: string | null })[] = []
  let error: string | null = null

  try {
    payments = await getAllPayments()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch payments'
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments Management</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p className="font-semibold">Error loading payments</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

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

      <PaymentsTable payments={payments} />
    </div>
  )
}
