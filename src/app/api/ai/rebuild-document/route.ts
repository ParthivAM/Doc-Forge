// FILE: src/app/api/ai/rebuild-document/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyJwt } from '@/lib/auth'
import { cookies } from 'next/headers'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-tracker'
import { logFeatureUsed, logRebuildSuccess } from '@/lib/logger'

const AI_API_KEY = process.env.AI_API_KEY!
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash'
const AI_API_BASE = process.env.AI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta'

const rebuildSchema = z.object({
    extractedText: z.string().min(1),
    documentType: z.string(),
    tone: z.string(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    title: z.string().optional(),
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

        // Check usage limits
        const usageCheck = await checkUsageLimit(payload.userId, 'rebuild')
        if (!usageCheck.allowed) {
            return NextResponse.json(
                {
                    error: usageCheck.message || 'Daily rebuild limit reached. Upgrade to Pro for unlimited rebuilds.',
                    limitExceeded: true,
                    usage: { current: usageCheck.current, limit: usageCheck.limit }
                },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { extractedText, documentType, tone, summary, keyPoints, title } = rebuildSchema.parse(body)

        // Build rebuild prompt based on document type
        let typeSpecificInstructions = ''
        const docTypeLower = documentType.toLowerCase()

        if (docTypeLower.includes('resume') || docTypeLower.includes('cv') || docTypeLower.includes('curriculum')) {
            typeSpecificInstructions = `
This is a RESUME/CV document. Create a clean, modern resume layout:

STRUCTURE REQUIRED:
- Full name on top (large/prominent)
- Professional title/role underneath
- Contact information in a single line (email, phone, location, LinkedIn if present)
- Clear section headings: PROFILE SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS
- Use bullet points (•) for responsibilities and achievements under each role
- For SKILLS section, group technical/hard skills and soft skills separately if possible
- List experiences in reverse chronological order
- Keep it professional and concise

FORMAT:
- Use ALL CAPS for section headings
- Separate contact info with | or similar
- Do NOT use markdown syntax like ** or #
- Use plain text bullet points (•)`
        } else if (docTypeLower.includes('letter') || docTypeLower.includes('correspondence')) {
            typeSpecificInstructions = `
This is a LETTER document. Create a clean letter format:
- Date at the top
- Recipient address
- Salutation
- Body paragraphs
- Professional closing
- Sender name/signature block`
        } else if (docTypeLower.includes('contract') || docTypeLower.includes('agreement')) {
            typeSpecificInstructions = `
This is a CONTRACT/AGREEMENT document. Create a clean legal document format:
- Title/heading
- Parties involved section
- Numbered clauses/sections
- Clear terms and conditions
- Signature blocks at end`
        } else if (docTypeLower.includes('report') || docTypeLower.includes('analysis')) {
            typeSpecificInstructions = `
This is a REPORT document. Create a structured report format:
- Title/heading
- Executive summary (if applicable)
- Numbered sections with clear headings
- Key findings highlighted
- Conclusion section`
        } else if (docTypeLower.includes('certificate') || docTypeLower.includes('completion')) {
            typeSpecificInstructions = `
This is a CERTIFICATE document. Create a clean certificate format:
- Title prominently displayed
- Recipient name
- Achievement/completion details
- Date of issue
- Issuer/organization name
- Any certification ID or reference number`
        } else {
            typeSpecificInstructions = `
Create a clean, well-organized version of this ${documentType} document:
- Clear headings and sections
- Proper paragraph structure
- Bullet points where appropriate
- Professional formatting`
        }

        const prompt = `You are an expert document formatter and rebuilder.

TASK: Rebuild the following document into a clean, polished, professional version.

DOCUMENT TYPE: ${documentType}
DETECTED TONE: ${tone}
${typeSpecificInstructions}

DOCUMENT SUMMARY:
${summary}

KEY POINTS TO PRESERVE:
${keyPoints.map(p => `• ${p}`).join('\n')}

ORIGINAL EXTRACTED TEXT:
---
${extractedText}
---

REBUILD INSTRUCTIONS:
1. Create a clean, well-structured version of this document
2. Remove all PDF artifacts (page numbers, headers/footers, weird line breaks)
3. Fix any formatting issues or broken sentences
4. Preserve ALL important information and meaning
5. Use appropriate headings, bullet points, and structure
6. Match the original ${tone} tone
7. Make it look professional and polished

CRITICAL OUTPUT RULES:
- Output ONLY the final document text
- Do NOT output JSON
- Do NOT wrap the result in curly braces {}
- Do NOT include "templateId" or any metadata
- Do NOT add any explanations before or after the document
- Do NOT use markdown syntax like ** or ## unless appropriate for the document type
- Just output the clean, formatted document text directly`

        const response = await fetch(
            `${AI_API_BASE}/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4000,
                    }
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`AI API request failed: ${response.status} ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        let rebuiltText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rebuiltText) {
            throw new Error('AI failed to generate rebuilt document')
        }

        // Clean up the result - remove any accidental JSON wrapping
        rebuiltText = rebuiltText.trim()

        // If the AI accidentally returned JSON, extract the content
        if (rebuiltText.startsWith('{') && rebuiltText.includes('"content"')) {
            try {
                const parsed = JSON.parse(rebuiltText)
                if (parsed.content) {
                    rebuiltText = parsed.content
                }
            } catch (e) {
                // Not valid JSON, keep as is
            }
        }

        // Log and increment usage
        logFeatureUsed('rebuild_document', payload.userId)
        logRebuildSuccess(documentType, payload.userId)
        await incrementUsage(payload.userId, 'rebuild')

        return NextResponse.json({
            content: rebuiltText,
            documentType: documentType,
        })
    } catch (error: any) {
        console.error('Rebuild document error:', error)

        // Provide user-friendly error messages
        let userMessage = 'Failed to rebuild document. Please try again.'

        if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('quota')) {
            userMessage = 'AI service is busy right now. Please wait a moment and try again.'
        } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
            userMessage = 'Document too large to process. Try a smaller document.'
        } else if (error.message?.includes('API') || error.message?.includes('Gemini')) {
            userMessage = 'AI processing failed. Please try again in a few seconds.'
        }

        return NextResponse.json(
            { error: userMessage, canRetry: true },
            { status: 500 }
        )
    }
}
