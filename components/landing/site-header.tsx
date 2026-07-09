'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Infinity as InfinityIcon, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'Tools', href: '#tools' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Download', href: '#download' },
  { label: 'FAQ', href: '#faq' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient">
            <InfinityIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Unlimited <span className="text-gradient">Lovable</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session?.user ? (
            <>
              <Button render={<Link href="/dashboard" />} nativeButton={false} variant="ghost" size="sm">
                Dashboard
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button render={<Link href="/sign-in" />} nativeButton={false} variant="ghost" size="sm">
                Sign in
              </Button>
              <Button
                render={<Link href="/shop" />}
                nativeButton={false}
                size="sm"
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                Get a license
              </Button>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {session?.user ? (
                <>
                  <Button
                    render={<Link href="/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Button>
                  <Button
                    onClick={async () => {
                      setOpen(false)
                      await handleSignOut()
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    render={<Link href="/sign-in" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Button>
                  <Button
                    render={<Link href="/shop" />}
                    nativeButton={false}
                    size="sm"
                    className="bg-brand-gradient text-white"
                    onClick={() => setOpen(false)}
                  >
                    Get a license
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
