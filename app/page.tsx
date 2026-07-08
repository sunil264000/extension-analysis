import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-lg font-bold text-white">∞</span>
            </div>
            <span className="text-xl font-bold text-white">Lovable Infinity</span>
            <span className="ml-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300">Pro License Manager</span>
          </div>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/shop">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Get License
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold text-white">Enterprise License Management</h1>
          <p className="mb-12 text-xl text-slate-300">
            Secure, device-bound licenses for your Lovable Infinity extension with automatic validation and usage tracking.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/shop">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 text-lg hover:from-purple-700 hover:to-pink-700">
                Browse Plans
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="border-slate-600 px-8 py-6 text-lg text-white hover:bg-slate-700">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Patched Extension Download */}
      <section className="border-t border-slate-700 bg-slate-900/80 py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/40 bg-slate-800/80 p-10 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">Ready to Install</span>
            </div>
            <h2 className="mb-3 text-3xl font-bold text-white">Patched Extension — Offline Activation</h2>
            <p className="mb-6 text-slate-300">
              Download the fully patched <strong className="text-white">Lovable Infinity</strong> extension with local activation built in.
              No license key required — just load it unpacked in Chrome and it works immediately.
            </p>

            <div className="mb-8 rounded-lg border border-slate-600 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">What was patched</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">INTERNAL_LICENSE_MODE = true</strong> — skips remote session initialisation on startup</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">pkLicenseV2</strong> overridden with all required methods (validateLicenseKey, heartbeat, getOrCreate…)</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">pkSanitizeServerError, pkInvalidateAssertCache, pkShouldLockoutFromValidation</strong> — all missing helpers stubbed</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">chrome.storage.local</strong> seeded with a Lifetime plan record on every page load</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">fetch interceptor</strong> — any residual calls to validate/heartbeat endpoints return a 200 mock response</span></li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-400">✓</span><span><strong className="text-white">LOVABLE_VALIDATE_URL</strong> pointed at a local data-URI — popup.js never hits the real API</span></li>
              </ul>
            </div>

            <div className="mb-8 rounded-lg border border-blue-500/30 bg-blue-900/20 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-400">Installation instructions</h3>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                <li>Download the ZIP below.</li>
                <li>Extract it to a permanent folder (e.g. <code className="rounded bg-slate-700 px-1">~/extensions/lovable-infinity/</code>).</li>
                <li>Open Chrome → <code className="rounded bg-slate-700 px-1">chrome://extensions</code> → enable <strong className="text-white">Developer mode</strong>.</li>
                <li>Click <strong className="text-white">Load unpacked</strong> and select the extracted folder.</li>
                <li>Open any Lovable.dev project — the side-panel activates automatically.</li>
              </ol>
            </div>

            <a
              href="/lovable-infinity-patched.zip"
              download="lovable-infinity-patched.zip"
              className="inline-flex items-center gap-3 rounded-xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Patched Extension (.zip)
            </a>
            <p className="mt-3 text-xs text-slate-500">~808 KB · Chrome MV3 · Lovable Infinity 6.4.5</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-700 bg-slate-800/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">Powerful Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'Device Binding',
                description: 'Licenses are tied to specific devices via hardware fingerprinting to prevent unauthorized sharing.',
              },
              {
                title: 'Usage Tracking',
                description: 'Automatic hourly usage tracking with daily quota limits and analytics dashboard.',
              },
              {
                title: 'Multi-Tier Pricing',
                description: 'Flexible Pro and Enterprise tiers with customizable features and usage limits.',
              },
              {
                title: 'Automatic Validation',
                description: 'Extension validates licenses every hour with 24-hour offline support.',
              },
              {
                title: 'Admin Dashboard',
                description: 'Complete control over licenses, customers, payments, and analytics.',
              },
              {
                title: 'Payment Integration',
                description: 'Integrated with Cashfree and Razorpay for seamless payment processing.',
              },
            ].map((feature, i) => (
              <div key={i} className="rounded-lg border border-slate-600 bg-slate-700/50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">License Tiers</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                name: 'Pro',
                price: '₹4,999',
                features: ['5 Devices', '1000 Daily API Calls', '30 Days Validity', 'Priority Support'],
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                features: ['Unlimited Devices', 'Unlimited API Calls', 'Custom Duration', '24/7 Support'],
              },
            ].map((plan, i) => (
              <div key={i} className="rounded-lg border border-purple-500/50 bg-slate-700/50 p-8">
                <h3 className="mb-2 text-2xl font-bold text-white">{plan.name}</h3>
                <p className="mb-6 text-3xl font-bold text-purple-400">{plan.price}</p>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-slate-300">
                      <span className="text-purple-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-700 bg-slate-800/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mb-8 text-slate-300">
            Browse our license plans or log in to your account to manage licenses.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/shop">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 hover:from-purple-700 hover:to-pink-700">
                View All Plans
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="border-slate-600 px-8 text-white hover:bg-slate-700">
                My Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2024 Lovable Infinity License Manager. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
