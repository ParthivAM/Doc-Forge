// FILE: src/app/api/compare-documents/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { compareDocuments, DocumentComparisonResult } from '@/lib/ai'
import { extractTextFromPDF } from '@/lib/pdf-utils'
import { logFeatureUsed, logCompareSuccess, logAIFailure } from '@/lib/logger'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-tracker'

export type CompareDocumentsResponse = {
    comparison: DocumentComparisonResult
    labelA: string
    labelB: string
    textPreviewA?: string
    textPreviewB?: string
}

export async function POST(request: Request) {
    try {
        // Check authentication
        const token = cookies().get('token')?.value
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check usage limits
        const usageCheck = await checkUsageLimit(payload.userId, 'compare')
        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: usageCheck.message || 'Daily comparison limit reached. Upgrade to Pro for unlimited comparisons.',
                    limitExceeded: true,
                    usage: { current: usageCheck.current, limit: usageCheck.limit }
                },
                { status: 429 }
            )
        }

        // Parse multipart form data
        const formData = await request.formData()
        const fileA = formData.get('fileA') as File | null
        const fileB = formData.get('fileB') as File | null
        const hint = formData.get('hint') as string | null
        const labelA = (formData.get('labelA') as string | null) || fileA?.name || 'Document A'
        const labelB = (formData.get('labelB') as string | null) || fileB?.name || 'Document B'

        // Validate both files exist
        if (!fileA || !fileB) {
            return NextResponse.json(
                { error: 'Both Document A and Document B are required' },
                { status: 400 }
            )
        }

        console.log('📂 Comparing documents:')
        console.log(`   Document A: ${fileA.name} (${(fileA.size / 1024).toFixed(1)}KB)`)
        console.log(`   Document B: ${fileB.name} (${(fileB.size / 1024).toFixed(1)}KB)`)

        // Extract text from both PDFs in parallel
        const [extractionA, extractionB] = await Promise.all([
            extractTextFromPDF(fileA),
            extractTextFromPDF(fileB)
        ])

        // Check for extraction errors
        if (!extractionA.success) {
            return NextResponse.json(
                { error: `Document A (${labelA}): ${extractionA.error}` },
                { status: 400 }
            )
        }

        if (!extractionB.success) {
            return NextResponse.json(
                { error: `Document B (${labelB}): ${extractionB.error}` },
                { status: 400 }
            )
        }

        console.log('✅ Both documents extracted successfully')
        console.log(`   Document A: ${extractionA.text.length} characters`)
        console.log(`   Document B: ${extractionB.text.length} characters`)

        // Call AI comparison
        console.log('🔄 Starting AI comparison...')
        const comparison = await compareDocuments({
            textA: extractionA.text,
            textB: extractionB.text,
            labelA,
            labelB,
            hint: hint || undefined,
        })

        console.log('✅ Comparison complete')
        console.log(`   Clause changes: ${comparison.clauseChanges.added.length} added, ${comparison.clauseChanges.removed.length} removed, ${comparison.clauseChanges.modified.length} modified`)
        console.log(`   Date changes: ${comparison.dateChanges.length}`)
        console.log(`   Amount changes: ${comparison.amountChanges.length}`)
        console.log(`   Risks identified: ${comparison.risks.length}`)

        const response: CompareDocumentsResponse = {
            comparison,
            labelA,
            labelB,
            textPreviewA: extractionA.text.substring(0, 500) + (extractionA.text.length > 500 ? '...' : ''),
            textPreviewB: extractionB.text.substring(0, 500) + (extractionB.text.length > 500 ? '...' : ''),
        }

        // Log successful comparison and increment usage
        const totalChanges = comparison.clauseChanges.added.length + comparison.clauseChanges.removed.length + comparison.clauseChanges.modified.length
        logCompareSuccess(totalChanges, payload.userId)
        logFeatureUsed('compare_documents', payload.userId)
        await incrementUsage(payload.userId, 'compare')

        return NextResponse.json(response)

    } catch (error: any) {
        console.error('Document comparison error:', error)

        // Log the failure
        logAIFailure(error.message || 'Unknown error', 'compare_documents')

        // Provide user-friendly error messages
        let userMessage = 'Failed to compare documents. Please try again.'

        if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
            userMessage = 'Comparison took too long. Try comparing smaller documents.'
        } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
            userMessage = 'AI service is busy. Please wait a moment and try again.'
        } else if (error.message?.includes('API') || error.message?.includes('Gemini')) {
            userMessage = 'AI comparison failed. Please try again in a few seconds.'
        }

        return NextResponse.json(
            { error: userMessage, canRetry: true },
            { status: 500 }
        )
    }
}
