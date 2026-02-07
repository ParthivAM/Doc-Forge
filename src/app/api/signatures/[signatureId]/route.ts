// FILE: src/app/api/signatures/[signatureId]/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const updateSignatureSchema = z.object({
    display_name: z.string().min(1).optional(),
    role_title: z.string().optional(),
    is_default: z.boolean().optional(),
})

// GET - Get a single signature
export async function GET(
    request: Request,
    { params }: { params: { signatureId: string } }
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

        const { data, error } = await supabaseAdmin
            .from('signatures')
            .select('*')
            .eq('id', params.signatureId)
            .eq('owner_id', userId)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
        }

        // Generate signed URL if image exists
        let imageUrl = null
        if (data.storage_path) {
            const { data: urlData } = await supabaseAdmin.storage
                .from('signatures')
                .createSignedUrl(data.storage_path, 3600)
            imageUrl = urlData?.signedUrl || null
        }

        return NextResponse.json({ ...data, imageUrl })
    } catch (error: any) {
        console.error('GET /api/signatures/[id] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH - Update a signature
export async function PATCH(
    request: Request,
    { params }: { params: { signatureId: string } }
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
        const parsed = updateSignatureSchema.parse(body)

        // Verify ownership
        const { data: existing } = await supabaseAdmin
            .from('signatures')
            .select('id')
            .eq('id', params.signatureId)
            .eq('owner_id', userId)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
        }

        // If setting as default, unset other defaults (handled by trigger, but double-check)
        if (parsed.is_default === true) {
            await supabaseAdmin
                .from('signatures')
                .update({ is_default: false })
                .eq('owner_id', userId)
                .neq('id', params.signatureId)
        }

        const { data, error } = await supabaseAdmin
            .from('signatures')
            .update({
                ...parsed,
                updated_at: new Date().toISOString(),
            })
            .eq('id', params.signatureId)
            .eq('owner_id', userId)
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('PATCH /api/signatures/[id] error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}

// DELETE - Delete a signature
export async function DELETE(
    request: Request,
    { params }: { params: { signatureId: string } }
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

        // Get signature to delete storage if exists
        const { data: existing } = await supabaseAdmin
            .from('signatures')
            .select('*')
            .eq('id', params.signatureId)
            .eq('owner_id', userId)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
        }

        // Delete from storage if image exists
        if (existing.storage_path) {
            await supabaseAdmin.storage
                .from('signatures')
                .remove([existing.storage_path])
        }

        // Delete the signature
        const { error } = await supabaseAdmin
            .from('signatures')
            .delete()
            .eq('id', params.signatureId)
            .eq('owner_id', userId)

        if (error) {
            throw error
        }

        // If this was the default, set another signature as default
        if (existing.is_default) {
            const { data: remaining } = await supabaseAdmin
                .from('signatures')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)

            if (remaining && remaining.length > 0) {
                await supabaseAdmin
                    .from('signatures')
                    .update({ is_default: true })
                    .eq('id', remaining[0].id)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/signatures/[id] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
