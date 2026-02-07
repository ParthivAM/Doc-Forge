// FILE: src/app/api/usage/route.ts
// API endpoint to get user's current usage stats

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { getUsageSummary } from '@/lib/usage-tracker'

export async function GET() {
    try {
        const token = cookies().get('token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const usage = await getUsageSummary(payload.userId)

        return NextResponse.json({
            usage,
            tier: 'free', // For future: could be 'pro' based on user subscription
        })
    } catch (error: any) {
        console.error('Error fetching usage:', error)
        return NextResponse.json(
            { error: 'Failed to fetch usage data' },
            { status: 500 }
        )
    }
}
