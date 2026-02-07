import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { analyzeDocumentText } from '@/lib/ai'
import { logFeatureUsed, logPDFParseError, logAIFailure } from '@/lib/logger'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-tracker'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MIN_TEXT_LENGTH = 50
const SCANNED_PDF_THRESHOLD = 100 // Very short text likely means scanned

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
        const usageCheck = await checkUsageLimit(payload.userId, 'upload')
        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: usageCheck.message || 'Daily analysis limit reached. Upgrade to Pro for unlimited analyses.',
                    limitExceeded: true,
                    usage: { current: usageCheck.current, limit: usageCheck.limit }
                },
                { status: 429 }
            )
        }

        // Parse multipart form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const hint = formData.get('hint') as string | null

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        console.log('📂 File received:', file.name)
        console.log('   Type:', file.type)
        console.log('   Size:', file.size)

        // Validate file type
        if (file.type !== 'application/pdf') {
            console.log('❌ Invalid file type')
            return NextResponse.json(
                { error: 'Please upload a PDF file' },
                { status: 400 }
            )
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            console.log('❌ File too large')
            return NextResponse.json(
                { error: 'Document too large. Maximum size is 10MB. Try compressing the PDF first.' },
                { status: 400 }
            )
        }

        // Check for empty file
        if (file.size < 100) {
            return NextResponse.json(
                { error: 'This file appears to be empty. Please upload a valid PDF document.' },
                { status: 400 }
            )
        }

        // Extract text from PDF
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log('🔄 Starting PDF parse...')

        let extractedText: string
        try {
            // pdf-parse v2.x uses PDFParse class instead of a function
            const pdfParseModule = await import('pdf-parse') as any
            const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse

            if (!PDFParse) {
                throw new Error('PDFParse class not found in pdf-parse module')
            }

            console.log('🔄 Using PDFParse class (v2.x API)')

            // Create parser instance with buffer data
            const parser = new PDFParse({ data: buffer })

            // Load the PDF first (required before getText)
            await parser.load()

            // Extract text from PDF
            const textResult = await parser.getText()

            // Debug: log what getText() returns
            console.log('🔍 getText() returned type:', typeof textResult)
            console.log('🔍 getText() returned value:', JSON.stringify(textResult)?.substring(0, 200))

            // Handle different return types
            if (typeof textResult === 'string') {
                extractedText = textResult
            } else if (textResult && typeof textResult === 'object') {
                // It might return { text: string } or an array
                extractedText = textResult.text || textResult.join?.('\n') || JSON.stringify(textResult)
            } else {
                extractedText = String(textResult || '')
            }

            console.log('✅ PDF parsed successfully')
        } catch (error: any) {
            console.error('❌ PDF parsing error:', error)
            return NextResponse.json(
                { error: `Failed to parse PDF file: ${error.message}` },
                { status: 400 }
            )
        }

        console.log('📝 Extracted text length:', extractedText?.length)

        // Check for empty or very short text (likely scanned PDF)
        if (!extractedText || extractedText.trim().length < MIN_TEXT_LENGTH) {
            const textLength = extractedText?.trim().length || 0

            if (textLength < SCANNED_PDF_THRESHOLD) {
                return NextResponse.json(
                    {
                        error: 'This appears to be a scanned document or image-based PDF. We cannot extract text from it. Please upload a text-based PDF or use OCR software to convert it first.',
                        errorType: 'SCANNED_PDF'
                    },
                    { status: 400 }
                )
            }

            return NextResponse.json(
                { error: 'Could not extract enough text from this PDF. The document may be empty or contain mostly images.' },
                { status: 400 }
            )
        }

        console.log('📄 Analyzing PDF:', file.name)

        // Call AI analysis
        const analysis = await analyzeDocumentText({
            text: extractedText,
            filename: file.name,
            hint: hint || undefined,
        })

        console.log('✅ Analysis complete')
        console.log('   Document type:', analysis.documentType)
        console.log('   Suggested template:', analysis.suggestedTemplateId)

        // Log successful feature usage and increment usage counter
        logFeatureUsed('analyze_document', payload.userId)
        await incrementUsage(payload.userId, 'upload')

        return NextResponse.json({
            ...analysis,
            extractedText: extractedText,
        })
    } catch (error: any) {
        console.error('Upload analysis error:', error)

        // Log the failure
        logAIFailure(error.message || 'Unknown error', 'analyze_document')

        // Provide user-friendly error messages
        let userMessage = 'Failed to analyze document. Please try again.'

        if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
            userMessage = 'Processing took too long. Please try a smaller document or simpler PDF.'
        } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
            userMessage = 'AI service is busy. Please wait a moment and try again.'
        } else if (error.message?.includes('API')) {
            userMessage = 'AI analysis failed. Please try again in a few seconds.'
        }

        return NextResponse.json(
            { error: userMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
            { status: 500 }
        )
    }
}
