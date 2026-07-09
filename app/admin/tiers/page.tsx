'use client'

import { useEffect, useState } from 'react'
import { getLicenseTiers, createLicenseTier } from '@/app/actions/admin'
import { LicenseTier } from '@/lib/db/schema'

export default function TiersAdminPage() {
  const [tiers, setTiers] = useState<LicenseTier[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    price: '',
    maxSeats: '3',
    maxUsageLimit: '',
    durationDays: '30',
    features: '',
    description: '',
  })

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const data = await getLicenseTiers()
        setTiers(data)
      } catch (error) {
        console.error('Failed to fetch tiers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTiers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const features = formData.features
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)

      await createLicenseTier({
        name: formData.name,
        displayName: formData.displayName,
        price: formData.price,
        maxSeats: parseInt(formData.maxSeats || '0'),
        maxUsageLimit: formData.maxUsageLimit
          ? parseInt(formData.maxUsageLimit || '0')
          : undefined,
        durationDays: parseInt(formData.durationDays || '0'),
        features,
        description: formData.description,
      })

      // Refresh tiers list
      const data = await getLicenseTiers()
      setTiers(data)
      setShowForm(false)
      setFormData({
        name: '',
        displayName: '',
        price: '',
        maxSeats: '3',
        maxUsageLimit: '',
        durationDays: '30',
        features: '',
        description: '',
      })
    } catch (error) {
      console.error('Failed to create tier:', error)
      alert('Failed to create tier')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading tiers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">License Tiers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Tier'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Create New Tier</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name (ID)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="pro"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Pro Plan"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="999"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (days)</label>
                <input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  placeholder="30"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Seats</label>
                <input
                  type="number"
                  value={formData.maxSeats}
                  onChange={(e) => setFormData({ ...formData, maxSeats: e.target.value })}
                  placeholder="3"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Usage/Day (empty for unlimited)
                </label>
                <input
                  type="number"
                  value={formData.maxUsageLimit}
                  onChange={(e) => setFormData({ ...formData, maxUsageLimit: e.target.value })}
                  placeholder="1000"
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Features (comma-separated)
              </label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Feature 1, Feature 2, Feature 3"
                className="w-full px-3 py-2 border rounded-lg bg-background"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this tier"
                className="w-full px-3 py-2 border rounded-lg bg-background"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create Tier'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div key={tier.id} className="bg-card border rounded-lg overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">{tier.displayName}</h3>
              <p className="text-2xl font-bold mt-2">₹{tier.price}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {tier.durationDays} days validity
              </p>
            </div>

            <div className="p-6 border-b space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Seats:</span> {tier.maxSeats}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Usage/Day:</span>{' '}
                {tier.maxUsageLimit || 'Unlimited'}
              </p>
              {tier.description && (
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              )}
            </div>

            {tier.features && tier.features.length > 0 && (
              <div className="p-6 border-b">
                <p className="font-semibold text-sm mb-2">Features:</p>
                <ul className="space-y-1">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-6">
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  tier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {tier.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="bg-card border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No license tiers created yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create First Tier
          </button>
        </div>
      )}
    </div>
  )
}
