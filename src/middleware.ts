// FILE: src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const PUBLIC_PATHS = [
    "/",
    "/login",
    "/signup",
]

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        console.log('🔓 JWT verify success (jose):', payload)
        return payload
    } catch (error: any) {
        console.error('🚨 JWT verify failed (jose):', error.message)
        return null
    }
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Public dynamic paths
    if (pathname.startsWith("/d/") || pathname.startsWith("/api/public/")) {
        return NextResponse.next()
    }

    // Static public paths
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next()
    }

    // Protect /dashboard and /api/documents
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/documents") || pathname.startsWith("/api/ai")) {
        const token = req.cookies.get("token")?.value
        console.log('🔍 Middleware checking:', pathname)
        console.log('🍪 Token present:', !!token)

        if (!token) {
            console.log('❌ No token found, redirecting to login')
            const loginUrl = new URL("/login", req.nextUrl.origin)
            loginUrl.searchParams.set("redirectTo", pathname)
            return NextResponse.redirect(loginUrl)
        }

        const payload = await verifyToken(token)
        console.log('✅ JWT verified:', !!payload)

        if (!payload) {
            console.log('❌ Invalid payload, redirecting to login')
            const loginUrl = new URL("/login", req.nextUrl.origin)
            loginUrl.searchParams.set("redirectTo", pathname)
            return NextResponse.redirect(loginUrl)
        }

        console.log('✅ Access granted to:', pathname)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
