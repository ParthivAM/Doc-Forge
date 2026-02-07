import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'DocForge - Professional Document Generation',
  description: 'Generate, issue and verify documents with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-brand-border/50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center shadow-button group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-brand-text">DocForge</span>
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-1 bg-brand-pillBg rounded-pill p-1">
                <NavLink href="/">Home</NavLink>
                <NavLink href="/dashboard">Dashboard</NavLink>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-ghost text-sm">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary text-sm">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="app-shell animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium text-brand-mutedText rounded-pill transition-all duration-200 hover:text-brand-text hover:bg-white"
    >
      {children}
    </Link>
  )
}
