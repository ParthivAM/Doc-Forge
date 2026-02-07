import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: Request, { params }: { params: { doc_id: string } }) {
    const { doc_id } = params

    const { data: document, error } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('doc_id', doc_id)
        .single()

    if (error || !document) {
        return NextResponse.json({ valid: false, message: 'Document not found' }, { status: 404 })
    }

    // Log verification
    await supabaseAdmin
        .from('verification_logs')
        .insert({
            document_id: document.id,
            verified_at: new Date().toISOString(),
            status: 'valid'
        })

    return NextResponse.json({
        valid: true,
        document: {
            title: document.title,
            hash: document.hash,
            verified_at: new Date().toISOString()
        }
    })
}
