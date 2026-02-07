"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
            redirect: 'manual', // Don't follow redirect automatically
        })

        setIsLoading(false)

        // If it's a redirect (307), follow it manually
        if (res.status === 307 || res.type === 'opaqueredirect') {
            window.location.href = '/dashboard'
            return
        }

        if (res.ok) {
            window.location.href = '/dashboard'
        } else {
            const data = await res.json()
            setError(data.error || 'Login failed')
        }
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="card">
                <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
                <p className="text-sm text-brand-mutedText mb-6">Login to your DocVerify account</p>

                {error && (
                    <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input"
                            required
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="btn-primary w-full">
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-brand-mutedText">
                    New to DocVerify?{' '}
                    <Link href="/signup" className="text-brand-accent hover:text-yellow-600 font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
