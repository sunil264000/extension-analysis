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
