"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })

        setIsLoading(false)

        if (res.ok) {
            router.push('/dashboard')
        } else {
            const data = await res.json()
            setError(data.error || 'Signup failed')
        }
    }

    return (
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="card space-y-4">
                <h3 className="text-2xl font-bold">Start verifying documents today</h3>
                <p className="text-brand-mutedText">
                    Join thousands of organizations using DocVerify to issue and verify authentic documents.
                </p>
                <ul className="space-y-2 text-sm text-brand-mutedText">
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                        Instant document verification
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                        Secure blockchain-backed storage
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                        Easy integration APIs
                    </li>
                </ul>
            </div>

            <div className="card">
                <h2 className="text-2xl font-bold mb-2">Create your DocVerify account</h2>
                <p className="text-sm text-brand-mutedText mb-6">Get started in less than a minute</p>

                {error && (
                    <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-1.5">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input"
                            required
                        />
                    </div>
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
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-brand-mutedText">
                    Already have an account?{' '}
                    <Link href="/login" className="text-brand-accent hover:text-yellow-600 font-medium">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
