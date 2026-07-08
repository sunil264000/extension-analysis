import { getCustomerStats, getRevenueStats } from '@/app/actions/admin'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default async function AdminDashboard() {
  const stats = await getCustomerStats()
  const revenueStats = await getRevenueStats()

  // Prepare revenue chart data
  const revenueChartData = Object.entries(revenueStats.monthlyRevenue)
    .sort()
    .map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue),
    }))

  return (
    <div className="space-y-8">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        {revenueChartData.length > 0 && (
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
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
