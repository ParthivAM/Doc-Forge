// FILE: src/app/api/documents/[docId]/sign/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { logSignDocument, logFeatureUsed } from '@/lib/logger'

const signDocumentSchema = z.object({
    signatureId: z.string().uuid(),
    displayName: z.string().min(1),
    roleTitle: z.string().optional(),
})

// POST - Sign a document
export async function POST(
    request: Request,
    { params }: { params: { docId: string } }
) {
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
        const parsed = signDocumentSchema.parse(body)

        // Verify document ownership
        const { data: document, error: docError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('doc_id', params.docId)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        if (document.owner_id !== userId) {
            return NextResponse.json({ error: 'You can only sign your own documents' }, { status: 403 })
        }

        // Verify signature ownership
        const { data: signature, error: sigError } = await supabaseAdmin
            .from('signatures')
            .select('*')
            .eq('id', parsed.signatureId)
            .eq('owner_id', userId)
            .single()

        if (sigError || !signature) {
            return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
        }

        // Get signed URL for signature image if exists
        let signatureImageUrl: string | null = null
        if (signature.storage_path) {
            const { data: urlData } = await supabaseAdmin.storage
                .from('signatures')
                .createSignedUrl(signature.storage_path, 31536000) // 1 year for storage in metadata
            signatureImageUrl = urlData?.signedUrl || null
        }

        // Update document metadata with signature info
        const existingMetadata = (document.metadata || {}) as any
        const updatedMetadata = {
            ...existingMetadata,
            signature: {
                signedByUserId: userId,
                signedByName: parsed.displayName,
                signedByRole: parsed.roleTitle || null,
                signedAt: new Date().toISOString(),
                signatureId: parsed.signatureId,
                signatureImageUrl: signatureImageUrl,
                signatureType: signature.signature_type,
            },
        }

        const { data: updatedDoc, error: updateError } = await supabaseAdmin
            .from('documents')
            .update({
                metadata: updatedMetadata,
                // Note: Not changing status to avoid db constraint issues
                // The signature info is stored in metadata.signature instead
            })
            .eq('doc_id', params.docId)
            .select()
            .single()

        if (updateError) {
            throw updateError
        }

        // Log successful signing
        logSignDocument(params.docId, userId)
        logFeatureUsed('sign_document', userId)

        return NextResponse.json({
            success: true,
            signature: updatedMetadata.signature,
        })
    } catch (error: any) {
        console.error('POST /api/documents/[docId]/sign error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

// DELETE - Remove signature from document
export async function DELETE(
    request: Request,
    { params }: { params: { docId: string } }
) {
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

        // Verify document ownership
        const { data: document, error: docError } = await supabaseAdmin
            .from('documents')
            .select('*')
            .eq('doc_id', params.docId)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        if (document.owner_id !== userId) {
            return NextResponse.json({ error: 'You can only modify your own documents' }, { status: 403 })
        }

        // Remove signature from metadata
        const existingMetadata = (document.metadata || {}) as any
        const { signature, ...restMetadata } = existingMetadata

        const { error: updateError } = await supabaseAdmin
            .from('documents')
            .update({
                metadata: restMetadata,
                // Note: Not changing status as signature info is tracked in metadata
            })
            .eq('doc_id', params.docId)

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/documents/[docId]/sign error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
