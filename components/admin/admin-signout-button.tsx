'use client'

import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function AdminSignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      Sign Out
    </button>
  )
}
