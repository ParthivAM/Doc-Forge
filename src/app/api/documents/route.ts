// FILE: src/app/api/documents/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { verifyJwt } from "@/lib/auth"
import crypto from "crypto"

const createDocumentSchema = z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    templateId: z.string().optional(),
    fields: z.record(z.string()).optional(),
})

export async function GET(request: Request) {
    try {
        const token = cookies().get('token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = payload.userId

        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('id, doc_id, title, created_at, hash, metadata')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        const docs = (data ?? []).map((doc) => {
            const metadata = (doc.metadata as any) || {}
            return {
                id: doc.id,
                doc_id: doc.doc_id,
                title: doc.title,
                created_at: doc.created_at,
                hash: doc.hash,
                isPublic: metadata.isPublic === true,
                signature: metadata.signature || null,
            }
        })

        return NextResponse.json(docs)
    } catch (error: any) {
        console.error('GET /api/documents error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const token = cookies().get('token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = payload.userId

        const body = await request.json()
        const parsed = createDocumentSchema.parse(body)

        const docId = crypto.randomUUID()
        const hash = crypto
            .createHash('sha256')
            .update(parsed.content, 'utf8')
            .digest('hex')
        const storagePath = `docs/${docId}.pdf`

        const metadata = {
            content: parsed.content,
            templateId: parsed.templateId ?? null,
            fields: parsed.fields ?? {},
            isPublic: false,
        }

        const { data: document, error } = await supabaseAdmin
            .from('documents')
            .insert({
                doc_id: docId,
                owner_id: userId,
                issuer_id: userId,
                title: parsed.title,
                hash: hash,
                storage_path: storagePath,
                status: 'ISSUED',
                metadata: metadata,
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json(document)
    } catch (error: any) {
        console.error('POST /api/documents error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}
