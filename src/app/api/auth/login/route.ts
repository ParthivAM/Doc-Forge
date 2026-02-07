import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyPassword, signJwt } from '@/lib/auth'
import { cookies } from 'next/headers'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = loginSchema.parse(body)

        const { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const isValid = await verifyPassword(password, user.password_hash)

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const token = signJwt({ userId: user.id, email: user.email })
        console.log('🔐 Login successful for:', user.email)
        console.log('🎫 Token generated:', token.substring(0, 20) + '...')

        const response = NextResponse.redirect(new URL('/dashboard', request.url), {
            status: 307,
        })

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400,
            path: '/',
        })
        console.log('🍪 Cookie set in response headers')

        return response
    } catch (error: any) {
        console.error('❌ Login error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
