'use client'

import { useEffect, useState } from 'react'
import { getAllCustomers } from '@/app/actions/admin'
import { Customer } from '@/lib/db/schema'

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getAllCustomers()
        setCustomers(data)
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Loading customers...</div>
  }

  const totalRevenue = customers.reduce(
    (sum, c) => sum + parseFloat(c.totalSpent.toString()),
    0
  )
  const activeCount = customers.filter((c) => c.isActive).length

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Customers Management</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Customers</div>
          <div className="text-2xl font-bold mt-1">{customers.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-1">{activeCount}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Country</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Licenses</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Total Spent</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm">{customer.email}</td>
                <td className="px-6 py-4 text-sm">{customer.companyName || '—'}</td>
                <td className="px-6 py-4 text-sm">{customer.country || '—'}</td>
                <td className="px-6 py-4 text-sm">{customer.licenseCount}</td>
                <td className="px-6 py-4 text-sm">
                  ₹{parseFloat(customer.totalSpent.toString()).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      customer.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="px-6 py-8 text-center text-muted-foreground">No customers yet</div>
        )}
      </div>
    </div>
  )
}
