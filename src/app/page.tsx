import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-brand-accent font-semibold text-sm uppercase tracking-wider mb-2">
            Professional Document Automation
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-brand-text mb-2">
            Create & Manage <span className="text-brand-accent">Official Documents</span>
          </h1>
          <p className="text-brand-mutedText text-lg max-w-xl">
            Generate contracts, offer letters, and business documents with AI. Upload PDFs to analyze and compare versions instantly.
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary hidden md:flex items-center gap-2">
          <span>Get Started Free</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<DocumentIcon />}
          value="1,247"
          label="Documents"
          delay="0"
        />
        <StatCard
          icon={<CheckIcon />}
          value="3,891"
          label="Verifications"
          delay="0.1s"
        />
        <StatCard
          icon={<UsersIcon />}
          value="432"
          label="Active Users"
          delay="0.2s"
        />
        <StatCard
          icon={<ChartIcon />}
          value="99.9%"
          label="Uptime"
          delay="0.3s"
        />
      </div>

      {/* Main Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Platform Overview */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-brand-text">Platform Overview</h2>
            <span className="badge badge-success">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>

          <div className="space-y-4">
            <ProgressItem label="Document Processing" value={85} />
            <ProgressItem label="Verification Speed" value={92} />
            <ProgressItem label="User Satisfaction" value={98} />
          </div>

          <div className="mt-6 pt-4 border-t border-brand-border/50">
            <div className="flex items-center gap-2 text-sm text-brand-mutedText">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xl font-semibold text-brand-text mb-6">Quick Actions</h2>

          <div className="space-y-3">
            <ActionCard
              icon={<PlusIcon />}
              title="Create Professional Document"
              description="AI generates contracts, letters, and reports"
              href="/dashboard"
            />
            <ActionCard
              icon={<UploadIcon />}
              title="Analyze Any PDF"
              description="Extract key data and auto-fill templates"
              href="/dashboard"
            />
            <ActionCard
              icon={<SignatureIcon />}
              title="E-Sign Documents"
              description="Add your signature and download as PDF"
              href="/dashboard"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="card bg-gradient-to-br from-brand-accent/10 to-brand-accentLight/50 border-brand-accent/20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-text mb-2">Create your first document in 2 minutes</h2>
            <p className="text-brand-mutedText">No credit card required. Start with 5 free documents.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/signup" className="btn-primary">
              Sign Up Free
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Try Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ icon, value, label, delay }: { icon: React.ReactNode; value: string; label: string; delay: string }) {
  return (
    <div className="stat-card animate-slide-up" style={{ animationDelay: delay }}>
      <div>
        <div className="stat-number">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
        {icon}
      </div>
    </div>
  )
}

// Progress Item Component
function ProgressItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-brand-mutedText">{label}</span>
        <span className="font-semibold text-brand-text">{value}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

// Action Card Component
function ActionCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-brand-border/50 bg-white transition-all duration-200 hover:border-brand-accent/30 hover:shadow-card group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:bg-brand-accent group-hover:text-brand-text transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-brand-text">{title}</div>
        <div className="text-sm text-brand-mutedText">{description}</div>
      </div>
      <svg className="w-5 h-5 text-brand-mutedText group-hover:text-brand-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// SVG Icons
function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function SignatureIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
