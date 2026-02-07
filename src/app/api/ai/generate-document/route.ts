// FILE: src/app/api/ai/generate-document/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateDocumentText, GenerateDocumentParams } from '@/lib/ai'
import { verifyJwt } from '@/lib/auth'
import { cookies } from 'next/headers'

const generateSchema = z.object({
    title: z.string().min(1),
    templateId: z.string(),
    context: z.string().optional(),
    fields: z.record(z.string()).optional(),
    existingContent: z.string().optional(),
})

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

        const body = await request.json()
        const { title, templateId, context, fields, existingContent } = generateSchema.parse(body)

        const params: GenerateDocumentParams = {
            title,
            templateId,
            context,
            fields,
            existingContent,
        }

        const result = await generateDocumentText(params)

        return NextResponse.json({
            content: result.content,
            detectedTemplateId: result.detectedTemplateId,
        })
    } catch (error: any) {
        console.error('Generate document error:', error)

        // Provide user-friendly error messages
        let userMessage = 'Failed to generate document. Please try again.'
        let canRetry = true

        if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('quota')) {
            userMessage = 'AI service is busy right now. Please wait a moment and try again.'
        } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
            userMessage = 'Request timed out. Try with a shorter document or simpler request.'
        } else if (error.message?.includes('API') || error.message?.includes('Gemini')) {
            userMessage = 'AI generation failed. Please try again in a few seconds.'
        } else if (error instanceof z.ZodError) {
            userMessage = 'Invalid request. Please fill in all required fields.'
            canRetry = false
        }

        return NextResponse.json(
            { error: userMessage, canRetry },
            { status: 500 }
        )
    }
}
