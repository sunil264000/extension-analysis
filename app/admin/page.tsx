import { getCustomerStats, getRevenueStats } from '@/app/actions/admin'

export default async function AdminDashboard() {
  let stats = {
    totalCustomers: 0,
    totalLicenses: 0,
    totalRevenue: 0,
    activeCustomers: 0,
  }
  let revenueStats = {
    totalRevenue: 0,
    transactionCount: 0,
  }
  let error = null

  try {
    stats = await getCustomerStats()
    revenueStats = await getRevenueStats()
  } catch (err) {
    console.error('[v0:admin] Dashboard stats error:', err)
    error = err instanceof Error ? err.message : 'Failed to load stats'
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.activeCustomers} active
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Licenses</h3>
          <p className="text-3xl font-bold mt-2">{stats.totalLicenses}</p>
          <p className="text-xs text-muted-foreground mt-2">Active licenses in system</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">All time</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
          <p className="text-3xl font-bold mt-2">{revenueStats.transactionCount}</p>
          <p className="text-xs text-muted-foreground mt-2">Completed payments</p>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/admin/usage"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Extension Usage</div>
              <div className="text-sm text-muted-foreground">
                See every prompt users send and review flagged activity
              </div>
            </a>
            <a
              href="/admin/licenses"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Licenses</div>
              <div className="text-sm text-muted-foreground">View and manage all licenses</div>
            </a>
            <a
              href="/admin/customers"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Customers</div>
              <div className="text-sm text-muted-foreground">
                View customer details and history
              </div>
            </a>
            <a
              href="/admin/tiers"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">License Tiers</div>
              <div className="text-sm text-muted-foreground">
                Create and manage pricing tiers
              </div>
            </a>
            <a
              href="/admin/payments"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Payments</div>
              <div className="text-sm text-muted-foreground">
                Track all payment transactions
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
