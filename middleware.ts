import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Public paths that don't require authentication
    if (
        path === '/' ||
        path === '/login' ||
        path === '/signup' ||
        path.startsWith('/verify') ||
        path.startsWith('/api/auth')
    ) {
        return NextResponse.next()
    }

    const token = request.cookies.get('token')?.value

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
