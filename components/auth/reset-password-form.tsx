'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Infinity as InfinityIcon,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resetPassword } from '@/app/actions/auth'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsValid(false)
      setError('Invalid or expired reset link. Please request a new one.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await resetPassword(token!, password)
      setSuccess(true)
      setTimeout(() => router.push('/sign-in'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
      setIsValid(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="hero-glow relative flex min-h-svh flex-col bg-background">
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient">
            <InfinityIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Unlimited <span className="text-gradient">Lovable</span>
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 ring-glow">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Create a new password
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a new password to secure your account.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Password reset successfully</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Redirecting to sign in...
              </p>
            </div>
          ) : !isValid ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-destructive">{error}</h2>
              </div>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                Request a new reset link
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  New Password
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-background transition-colors focus-within:border-brand/50">
                  <span className="pointer-events-none absolute left-3.5 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full bg-transparent py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Confirm Password
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-background transition-colors focus-within:border-brand/50">
                  <span className="pointer-events-none absolute left-3.5 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full bg-transparent py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {error && (
                <p
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                size="lg"
                className="mt-1 w-full bg-brand-gradient text-white hover:opacity-90"
              >
                {loading ? 'Resetting...' : 'Reset password'}
                {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Know your password?{' '}
            <Link
              href="/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
