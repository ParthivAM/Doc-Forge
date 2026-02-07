// FILE: src/app/api/signatures/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import crypto from 'crypto'

const createSignatureSchema = z.object({
    signature_type: z.enum(['drawn', 'uploaded', 'typed']),
    display_name: z.string().min(1, 'Display name is required'),
    role_title: z.string().optional(),
    image_data: z.string().optional(), // Base64 image for drawn/uploaded
})

// GET - List all signatures for the authenticated user
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

        const userId = payload.userId

        const { data, error } = await supabaseAdmin
            .from('signatures')
            .select('*')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('GET signatures error:', error)
            // If table doesn't exist, return empty array
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.log('Signatures table does not exist yet - returning empty array')
                return NextResponse.json([])
            }
            throw error
        }

        // Generate signed URLs for signature images (skip if no storage bucket)
        const signaturesWithUrls = await Promise.all(
            (data || []).map(async (sig) => {
                let imageUrl = null
                if (sig.storage_path) {
                    try {
                        const { data: urlData } = await supabaseAdmin.storage
                            .from('signatures')
                            .createSignedUrl(sig.storage_path, 3600)
                        imageUrl = urlData?.signedUrl || null
                    } catch (e) {
                        console.warn('Could not get signed URL for signature:', e)
                    }
                }
                return { ...sig, imageUrl }
            })
        )

        return NextResponse.json(signaturesWithUrls)
    } catch (error: any) {
        console.error('GET /api/signatures error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create a new signature
export async function POST(request: Request) {
    console.log('📝 POST /api/signatures - Creating new signature...')

    try {
        const token = cookies().get('token')?.value
        if (!token) {
            console.log('❌ No token found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            console.log('❌ Invalid token')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = payload.userId
        console.log('✅ User ID:', userId)

        const body = await request.json()
        console.log('📋 Request body:', { ...body, image_data: body.image_data ? '[BASE64_DATA]' : undefined })

        const parsed = createSignatureSchema.parse(body)
        console.log('✅ Validation passed')

        let storagePath: string | null = null

        // Handle image upload for drawn/uploaded signatures
        if (parsed.image_data && (parsed.signature_type === 'drawn' || parsed.signature_type === 'uploaded')) {
            console.log('📤 Processing image upload...')
            // Remove data URL prefix if present
            const base64Data = parsed.image_data.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')

            // Validate file size (max 500KB)
            if (buffer.length > 500 * 1024) {
                console.log('❌ Image too large:', buffer.length)
                return NextResponse.json(
                    { error: 'Signature image must be under 500KB' },
                    { status: 400 }
                )
            }

            // Generate unique filename
            const fileId = crypto.randomUUID()
            storagePath = `${userId}/${fileId}.png`
            console.log('📁 Storage path:', storagePath)

            // Upload to Supabase Storage
            const { error: uploadError } = await supabaseAdmin.storage
                .from('signatures')
                .upload(storagePath, buffer, {
                    contentType: 'image/png',
                    upsert: false,
                })

            if (uploadError) {
                console.error('❌ Signature upload error:', uploadError)
                // Continue without image if storage bucket doesn't exist
                if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
                    console.log('⚠️ Storage bucket does not exist - creating signature without image')
                    storagePath = null
                } else {
                    return NextResponse.json(
                        { error: 'Failed to upload signature image: ' + uploadError.message },
                        { status: 500 }
                    )
                }
            } else {
                console.log('✅ Image uploaded successfully')
            }
        }

        // Check if this should be the default (first signature is auto-default)
        console.log('🔍 Checking existing signatures...')
        let isDefault = true
        try {
            const { count, error: countError } = await supabaseAdmin
                .from('signatures')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', userId)

            if (countError) {
                console.error('❌ Count error:', countError)
                // If table doesn't exist, this will be the first signature
                if (countError.code === '42P01' || countError.message?.includes('does not exist')) {
                    console.log('⚠️ Signatures table does not exist - please run the migration first!')
                    return NextResponse.json(
                        { error: 'Signatures table not found. Please run the database migration first.' },
                        { status: 500 }
                    )
                }
            }
            isDefault = (count || 0) === 0
            console.log('📊 Existing signatures count:', count, '- Will be default:', isDefault)
        } catch (e) {
            console.error('❌ Error checking signature count:', e)
        }

        // Insert signature record
        console.log('💾 Inserting signature record...')
        const { data: signature, error } = await supabaseAdmin
            .from('signatures')
            .insert({
                owner_id: userId,
                signature_type: parsed.signature_type,
                display_name: parsed.display_name,
                role_title: parsed.role_title || null,
                storage_path: storagePath,
                is_default: isDefault,
            })
            .select()
            .single()

        if (error) {
            console.error('❌ Insert error:', error)
            // Check for table not found error
            if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
                return NextResponse.json(
                    { error: 'Database table "signatures" not found. Please run the SQL migration in Supabase first.' },
                    { status: 500 }
                )
            }
            throw error
        }

        console.log('✅ Signature created successfully:', signature.id)
        return NextResponse.json(signature)
    } catch (error: any) {
        console.error('❌ POST /api/signatures error:', error)
        // Check for table not found error
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            return NextResponse.json(
                { error: 'Database table "signatures" not found. Please run the SQL migration in Supabase first.' },
                { status: 500 }
            )
        }
        return NextResponse.json({ error: error.message || 'Failed to create signature' }, { status: 400 })
    }
}
