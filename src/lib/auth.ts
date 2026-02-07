import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash)
}

export function signJwt(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' })
}

export function verifyJwt(token: string) {
    try {
        const payload = jwt.verify(token, JWT_SECRET)
        console.log('🔓 JWT verify success, payload:', payload)
        return payload
    } catch (error: any) {
        console.error('🚨 JWT verify failed:', error.message)
        console.error('🚨 Error name:', error.name)
        console.error('🚨 Token:', token.substring(0, 30) + '...')
        console.error('🚨 JWT_SECRET present:', !!JWT_SECRET)
        return null
    }
}
