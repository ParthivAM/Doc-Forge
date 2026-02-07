import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashPassword, signJwt } from '@/lib/auth'
import { cookies } from 'next/headers'

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = signupSchema.parse(body)

        // Check if user exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        const hashedPassword = await hashPassword(password)

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .insert({ email, password_hash: hashedPassword })
            .select()
            .single()

        if (error) throw error

        const token = signJwt({ userId: user.id, email: user.email })

        const response = NextResponse.json({ user })

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400,
            path: '/',
        })

        return response
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
