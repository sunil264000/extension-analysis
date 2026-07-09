'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllLicenses } from '@/app/actions/admin'
import { License } from '@/lib/db/schema'

export default function LicensesAdminPage() {
  const [licenses, setLicenses] = useState<(License & { customerEmail?: string | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const fetchLicenses = async () => {
      try {
        const data = await getAllLicenses()
        setLicenses(data)
      } catch (error) {
        console.error('Failed to fetch licenses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLicenses()
  }, [])


  const filteredLicenses =
    filter === 'all'
      ? licenses
      : licenses.filter((l) => l.status === filter)

  const stats = {
    active: licenses.filter((l) => l.status === 'active').length,
    expired: licenses.filter((l) => l.status === 'expired').length,
    suspended: licenses.filter((l) => l.status === 'suspended').length,
    revoked: licenses.filter((l) => l.status === 'revoked').length,
  }

  if (loading) {
    return <div className="text-center py-8">Loading licenses...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Licenses Management</h1>
        <Link
          href="/admin/licenses/new"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create License
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active', value: stats.active, color: 'bg-green-100 text-green-800' },
          { label: 'Expired', value: stats.expired, color: 'bg-red-100 text-red-800' },
          { label: 'Suspended', value: stats.suspended, color: 'bg-yellow-100 text-yellow-800' },
          { label: 'Revoked', value: stats.revoked, color: 'bg-orange-100 text-orange-800' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'active', 'expired', 'suspended', 'revoked'].map((status) => (
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

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">License Key</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Expires</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Seats</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Usage</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.map((license) => (
              <tr key={license.id} className="border-t hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono">{license.licenseKey}</td>
                <td className="px-6 py-4 text-sm">{license.customerEmail || license.customerId}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(license.expiresAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">{license.seatsUsed}</td>
                <td className="px-6 py-4 text-sm">{license.usageCount}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      license.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : license.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {license.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Link
                    href={`/admin/licenses/${license.id}`}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLicenses.length === 0 && (
          <div className="px-6 py-8 text-center text-muted-foreground">
            No licenses found
          </div>
        )}
      </div>
    </div>
  )
}
