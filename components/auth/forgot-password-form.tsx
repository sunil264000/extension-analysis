'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Infinity as InfinityIcon,
  Mail,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendPasswordResetEmail } from '@/app/actions/auth'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await sendPasswordResetEmail(email)
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
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
              Recover your account
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Check your email</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ve sent a password reset link to <span className="font-medium">{email}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                The link will expire in 24 hours. Didn&apos;t receive it? Check your spam folder.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                Back to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </label>
                <div className="relative flex items-center rounded-xl border border-border bg-background transition-colors focus-within:border-brand/50">
                  <span className="pointer-events-none absolute left-3.5 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="yourname@gmail.com"
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
                disabled={loading}
                size="lg"
                className="mt-1 w-full bg-brand-gradient text-white hover:opacity-90"
              >
                {loading ? 'Sending...' : 'Send reset link'}
                {!loading && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
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
