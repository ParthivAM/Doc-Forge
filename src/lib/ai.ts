// FILE: src/lib/ai.ts
import { DOCUMENT_TEMPLATES, getTemplateById, DocumentTemplate } from '@/config/templates'

const AI_API_KEY = process.env.AI_API_KEY!
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.0-flash'
const AI_API_BASE = process.env.AI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta'

export type GenerateDocumentParams = {
    title: string
    templateId: string
    context?: string
    fields?: Record<string, string>
    existingContent?: string
}

export type GenerateDocumentResult = {
    content: string
    detectedTemplateId?: string
}

export type RewriteMode =
    | "improve"
    | "formal"
    | "concise"
    | "friendly"
    | "expand"
    | "summarize"

export type RewriteDocumentParams = {
    content: string
    mode: RewriteMode
    title?: string
    templateId?: string
}

export type RewriteDocumentResult = {
    content: string
}

export type DocumentAnalysisRequest = {
    text: string
    filename?: string
    hint?: string
}

export type DocumentAnalysisResult = {
    summary: string
    keyPoints: string[]
    tone: string
    documentType: string
    entities: {
        people: string[]
        organizations: string[]
        dates: string[]
        deadlines: string[]
        amounts: string[]
        other: string[]
    }
    suggestedTemplateId: string | null
}

export async function generateDocumentText(
    params: GenerateDocumentParams
): Promise<GenerateDocumentResult> {
    if (!AI_API_KEY) {
        throw new Error('AI configuration missing: AI_API_KEY is not set')
    }

    if (!AI_MODEL) {
        throw new Error('AI configuration missing: AI_MODEL is not set')
    }

    let prompt = ''

    if (params.templateId === 'custom_freeform') {
        // Smart auto-detection mode
        const templateList = DOCUMENT_TEMPLATES
            .filter(t => t.id !== 'custom_freeform')
            .map(t => `- ${t.id}: ${t.description}`)
            .join('\n')

        prompt = `You are an AI writing assistant inside a product called DocVerify.

The user will provide a natural language description of what document they want.

Your task:
1. Decide which document type best matches their request from these available templates:

${templateList}

2. Generate the complete document content appropriate for that template type.

3. Output STRICT JSON ONLY in this exact format:
{
  "templateId": "<one of the template IDs above>",
  "content": "<the complete document text>"
}

CRITICAL RULES:
- Output ONLY valid JSON, nothing else
- No markdown code blocks, no comments, no extra text
- The "templateId" MUST be one of the IDs listed above
- The "content" should be the full document text as plain text
- Do not explain your choice, just output the JSON

`

        if (params.title) {
            prompt += `Document title: ${params.title}\n\n`
        }

        if (params.existingContent && params.existingContent.trim()) {
            prompt += `Existing content to improve/expand:\n${params.existingContent}\n\n`
        }

        prompt += `User description:\n`
        if (params.context && params.context.trim()) {
            prompt += params.context
        } else {
            prompt += params.title || 'Generate a professional document'
        }

        try {
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
                            temperature: 0.4,
                            maxOutputTokens: 1000,
                        }
                    }),
                }
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(`Gemini API request failed: ${response.status} ${JSON.stringify(errorData)}`)
            }

            const data = await response.json()
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (!jsonText) {
                throw new Error('AI generation failed: No content generated from Gemini')
            }

            jsonText = jsonText.trim()

            // Try to parse JSON
            let parsed: { templateId?: string; content?: string } | null = null
            try {
                parsed = JSON.parse(jsonText)
            } catch (e) {
                // Fallback: treat whole text as content
                return {
                    content: jsonText,
                    detectedTemplateId: 'custom_freeform',
                }
            }

            if (!parsed || !parsed.content) {
                return {
                    content: jsonText,
                    detectedTemplateId: 'custom_freeform',
                }
            }

            // Validate templateId
            const knownIds = new Set(DOCUMENT_TEMPLATES.map(t => t.id))
            const detectedTemplateId =
                parsed.templateId && knownIds.has(parsed.templateId)
                    ? parsed.templateId
                    : 'custom_freeform'

            return {
                content: parsed.content,
                detectedTemplateId,
            }
        } catch (error: any) {
            console.error('AI generation error:', error)
            throw new Error(`Failed to generate document: ${error.message}`)
        }
    } else {
        // Standard template mode
        const template = getTemplateById(params.templateId)

        prompt = `You are an AI writing assistant inside a product called DocVerify.\n`

        if (template) {
            prompt += `You are generating a "${template.name}" document.\n`
            prompt += `Description: ${template.description}\n\n`
        }

        prompt += `Title: ${params.title}\n\n`

        if (params.fields && Object.keys(params.fields).length > 0 && template) {
            prompt += `Document Details:\n`
            for (const field of template.fields) {
                const value = params.fields[field.id]
                if (value) {
                    prompt += `- ${field.label}: ${value}\n`
                }
            }
            prompt += `\n`
        }

        if (params.context) {
            prompt += `Context from user: ${params.context}\n\n`
        }

        if (params.existingContent && params.existingContent.trim()) {
            prompt += `Existing content to improve/expand:\n${params.existingContent}\n\n`
        }

        if (template) {
            prompt += `Instructions:\n${template.aiInstruction}\n\n`
        } else {
            prompt += `Instructions: Write a professional document based on the title and context provided. Use clear, formal language.\n\n`
        }

        prompt += `Return only the final document text as plain text. Do not include any explanations or analysis.`

        try {
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
                            temperature: 0.4,
                            maxOutputTokens: 1000,
                        }
                    }),
                }
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(`Gemini API request failed: ${response.status} ${JSON.stringify(errorData)}`)
            }

            const data = await response.json()
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (!generatedText) {
                throw new Error('AI generation failed: No content generated from Gemini')
            }

            return {
                content: generatedText.trim(),
                detectedTemplateId: params.templateId,
            }
        } catch (error: any) {
            console.error('AI generation error:', error)
            throw new Error(`Failed to generate document: ${error.message}`)
        }
    }
}

export async function rewriteDocumentText(
    params: RewriteDocumentParams
): Promise<RewriteDocumentResult> {
    if (!AI_API_KEY) {
        throw new Error('AI configuration missing: AI_API_KEY is not set')
    }

    if (!AI_MODEL) {
        throw new Error('AI configuration missing: AI_MODEL is not set')
    }

    const template = params.templateId ? getTemplateById(params.templateId) : undefined

    let modeInstruction = ''
    switch (params.mode) {
        case 'improve':
            modeInstruction = 'Improve clarity, flow, and professionalism. Keep all important information, preserve the meaning, and keep roughly the same length.'
            break
        case 'formal':
            modeInstruction = 'Rewrite in a more formal, professional tone. Remove slang, keep structure and meaning.'
            break
        case 'concise':
            modeInstruction = 'Make the text more concise and to the point while preserving key information. Reduce redundancy and unnecessary wording.'
            break
        case 'friendly':
            modeInstruction = 'Make the tone warmer and friendlier while remaining professional. Keep the same structure and meaning.'
            break
        case 'expand':
            modeInstruction = 'Expand the text into a more detailed version, adding helpful explanations, examples, and context while staying consistent with the original meaning.'
            break
        case 'summarize':
            modeInstruction = 'Summarize the text into a shorter version that keeps only the key points. Use clear, simple language.'
            break
    }

    let prompt = 'You are an AI writing assistant inside a product called DocVerify.\n'

    if (template) {
        prompt += `The document is based on the "${template.name}" template.\n`
        prompt += `Template description: ${template.description}\n\n`
    }

    if (params.title) {
        prompt += `Document title: ${params.title}\n\n`
    }

    prompt += 'User has provided the following document text:\n'
    prompt += '-----\n'
    prompt += params.content
    prompt += '\n-----\n\n'

    prompt += 'Your task:\n'
    prompt += modeInstruction + '\n\n'
    prompt += 'Return only the rewritten document text as plain text. Do not explain what you changed.\n'

    try {
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
                        temperature: 0.4,
                        maxOutputTokens: 1000,
                    }
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`Gemini API request failed: ${response.status} ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        const rewrittenText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rewrittenText) {
            throw new Error('Rewrite failed: No content generated from Gemini')
        }

        return {
            content: rewrittenText.trim(),
        }
    } catch (error: any) {
        console.error('Rewrite error:', error)
        throw new Error(`Rewrite failed: ${error.message}`)
    }
}

export async function analyzeDocumentText(
    params: DocumentAnalysisRequest
): Promise<DocumentAnalysisResult> {
    if (!AI_API_KEY) {
        throw new Error('AI configuration missing: AI_API_KEY is not set')
    }

    if (!AI_MODEL) {
        throw new Error('AI configuration missing: AI_MODEL is not set')
    }

    // Get list of available template IDs for suggestion
    const templateList = DOCUMENT_TEMPLATES
        .map(t => `- ${t.id}: ${t.name} - ${t.description}`)
        .join('\n')

    let prompt = `You are an AI document analyzer inside DocVerify, a document automation platform.

Your task is to analyze the following document text and provide comprehensive structured information.

AVAILABLE TEMPLATES (for suggestedTemplateId):
${templateList}

${params.filename ? `FILENAME: ${params.filename}\n` : ''}${params.hint ? `USER HINT: ${params.hint}\n` : ''}
DOCUMENT TEXT:
-----
${params.text.substring(0, 8000)}
-----

Analyze this document and provide:
1. A concise summary (2-5 sentences)
2. 5-10 key points or main takeaways
3. The tone (e.g., formal, legal, friendly, technical, persuasive)
4. The document type (e.g., contract, policy, report, email, proposal, invoice, letter, other)
5. Important entities:
   - People names
   - Organization names
   - Important dates
   - Deadlines
   - Money amounts or prices
   - Other key terms or entities
6. Suggested template ID from the available templates list above (or null if none fit)

OUTPUT STRICT JSON ONLY in this format:
{
  "summary": "...",
  "keyPoints": ["point 1", "point 2", ...],
  "tone": "...",
  "documentType": "...",
  "entities": {
    "people": ["name1", "name2"],
    "organizations": ["org1", "org2"],
    "dates": ["date1", "date2"],
    "deadlines": ["deadline1"],
    "amounts": ["$100", "€50"],
    "other": ["term1", "term2"]
  },
  "suggestedTemplateId": "template_id or null"
}

CRITICAL: Output ONLY valid JSON. No markdown, no explanations, no code blocks.`

    try {
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
                        maxOutputTokens: 2000,
                    }
                }),
            }
        )

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`Gemini API request failed: ${response.status} ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!jsonText) {
            throw new Error('Analysis failed: No content generated from Gemini')
        }

        jsonText = jsonText.trim()

        // Try to parse JSON
        let parsed: DocumentAnalysisResult | null = null
        try {
            parsed = JSON.parse(jsonText)
        } catch (e) {
            // Try to extract JSON from markdown code blocks if present
            const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[1])
                } catch (e2) {
                    throw new Error('Failed to parse analysis JSON')
                }
            } else {
                throw new Error('Failed to parse analysis JSON')
            }
        }

        if (!parsed) {
            throw new Error('Failed to parse analysis result')
        }

        // Validate suggestedTemplateId
        if (parsed.suggestedTemplateId) {
            const knownIds = new Set(DOCUMENT_TEMPLATES.map(t => t.id))
            if (!knownIds.has(parsed.suggestedTemplateId)) {
                parsed.suggestedTemplateId = null
            }
        }

        return parsed
    } catch (error: any) {
        console.error('Document analysis error:', error)
        throw new Error(`Failed to analyze document: ${error.message}`)
    }
}

// Types for field extraction
export type ExtractedFields = Record<string, string>

export type FieldExtractionParams = {
    templateId: string
    analysisResult: DocumentAnalysisResult
    extractedText: string
}

/**
 * Extract template field values from AI analysis results
 * Maps entities and key points to template fields based on field mapping metadata
 */
export function extractTemplateFieldsFromAnalysis(params: FieldExtractionParams): ExtractedFields {
    const { templateId, analysisResult, extractedText } = params

    const template = getTemplateById(templateId)
    if (!template || template.fields.length === 0) {
        return {}
    }

    const extractedFields: ExtractedFields = {}
    const usedEntities = new Set<string>() // Track used entities to avoid duplicates

    for (const field of template.fields) {
        const mapping = field.mapping
        if (!mapping) {
            continue
        }

        let value: string | undefined

        // Try to find a matching entity based on entityTypes
        for (const entityType of mapping.entityTypes) {
            if (value) break // Already found a value

            const entities = analysisResult.entities[entityType]
            if (!entities || entities.length === 0) continue

            // Find first unused entity of this type
            for (const entity of entities) {
                if (!usedEntities.has(`${entityType}:${entity}`)) {
                    // Check if any keyword matches (case-insensitive)
                    const fieldIdLower = field.id.toLowerCase()
                    const keywordsLower = mapping.keywords.map(k => k.toLowerCase())

                    // For name-related fields, prioritize people
                    if (entityType === 'people' &&
                        (fieldIdLower.includes('name') || keywordsLower.some(k => k.includes('name')))) {
                        value = entity
                        usedEntities.add(`${entityType}:${entity}`)
                        break
                    }

                    // For organization fields
                    if (entityType === 'organizations' &&
                        (fieldIdLower.includes('company') || fieldIdLower.includes('org') ||
                            keywordsLower.some(k => k.includes('company') || k.includes('org')))) {
                        value = entity
                        usedEntities.add(`${entityType}:${entity}`)
                        break
                    }

                    // For date fields
                    if (entityType === 'dates' || entityType === 'deadlines') {
                        value = entity
                        usedEntities.add(`${entityType}:${entity}`)
                        break
                    }

                    // For amount fields
                    if (entityType === 'amounts' &&
                        (fieldIdLower.includes('salary') || fieldIdLower.includes('amount') ||
                            fieldIdLower.includes('price') || fieldIdLower.includes('budget') ||
                            keywordsLower.some(k => k.includes('salary') || k.includes('amount')))) {
                        value = entity
                        usedEntities.add(`${entityType}:${entity}`)
                        break
                    }

                    // For other entity types, use first available
                    if (entityType === 'other') {
                        // Try to match based on keywords in the entity text
                        const entityLower = entity.toLowerCase()
                        if (keywordsLower.some(keyword => entityLower.includes(keyword))) {
                            value = entity
                            usedEntities.add(`${entityType}:${entity}`)
                            break
                        }
                    }
                }
            }
        }

        // If no entity match, try to extract from key points
        if (!value && mapping.keywords.length > 0) {
            for (const keyPoint of analysisResult.keyPoints) {
                const keyPointLower = keyPoint.toLowerCase()
                for (const keyword of mapping.keywords) {
                    if (keyPointLower.includes(keyword.toLowerCase())) {
                        // Extract the relevant part of the key point
                        value = keyPoint
                        break
                    }
                }
                if (value) break
            }
        }

        // Use fallback if defined and no value found
        if (!value && mapping.fallback) {
            value = mapping.fallback
        }

        // Set the extracted value
        if (value) {
            extractedFields[field.id] = value.trim()
        }
    }

    // Special handling for common field patterns
    // If we have a role/position field but no value, try to extract from documentType
    const roleField = template.fields.find(f =>
        f.id.includes('role') || f.id.includes('position') || f.id.includes('title')
    )
    if (roleField && !extractedFields[roleField.id]) {
        // Look for job title patterns in key points or entities
        const titlePatterns = ['engineer', 'manager', 'director', 'analyst', 'developer',
            'consultant', 'specialist', 'coordinator', 'associate', 'intern']
        for (const entity of analysisResult.entities.other) {
            const entityLower = entity.toLowerCase()
            if (titlePatterns.some(p => entityLower.includes(p))) {
                extractedFields[roleField.id] = entity
                break
            }
        }
    }

    return extractedFields
}

/**
 * Enhanced field extraction that uses AI to extract specific values
 * for fields that couldn't be matched through entity mapping
 */
export async function enhancedFieldExtraction(params: FieldExtractionParams): Promise<ExtractedFields> {
    // First, try rule-based extraction
    const basicExtraction = extractTemplateFieldsFromAnalysis(params)

    const template = getTemplateById(params.templateId)
    if (!template) return basicExtraction

    // Find fields that weren't filled
    const missingFields = template.fields.filter(f =>
        f.required && !basicExtraction[f.id] && f.mapping
    )

    if (missingFields.length === 0) {
        return basicExtraction
    }

    // Use AI to extract missing required fields
    try {
        const fieldDescriptions = missingFields.map(f =>
            `- ${f.id}: ${f.label} (keywords: ${f.mapping?.keywords.join(', ')})`
        ).join('\n')

        const prompt = `Extract specific values for the following fields from this document text.

FIELDS TO EXTRACT:
${fieldDescriptions}

DOCUMENT TEXT:
${params.extractedText.substring(0, 4000)}

ANALYSIS CONTEXT:
- Document Type: ${params.analysisResult.documentType}
- Summary: ${params.analysisResult.summary}

OUTPUT: Return only a JSON object with field IDs as keys and extracted values.
Example: {"candidate_name": "John Doe", "position": "Software Engineer"}
If a field cannot be found, omit it from the result.
Return ONLY valid JSON, no explanation.`

        const response = await fetch(
            `${AI_API_BASE}/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
                }),
            }
        )

        if (response.ok) {
            const data = await response.json()
            let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

            if (jsonText) {
                // Clean up JSON if wrapped in markdown
                jsonText = jsonText.replace(/```json?\s*/g, '').replace(/```\s*/g, '')

                try {
                    const aiExtracted = JSON.parse(jsonText)
                    // Merge AI-extracted fields with basic extraction
                    return { ...basicExtraction, ...aiExtracted }
                } catch (e) {
                    // JSON parse failed, return basic extraction
                }
            }
        }
    } catch (error) {
        console.error('Enhanced field extraction error:', error)
    }

    return basicExtraction
}

// ==================== DOCUMENT COMPARISON ====================

export type ClauseChange = {
    title: string
    description: string
    beforeSnippet?: string
    afterSnippet?: string
}

export type DateChange = {
    field: string
    oldValue: string
    newValue: string
    description: string
}

export type AmountChange = {
    field: string
    oldValue: string
    newValue: string
    description: string
    significance: 'minor' | 'moderate' | 'major'
}

export type ResponsibilityChange = {
    party: string
    change: 'added' | 'removed' | 'modified'
    description: string
}

export type DocumentComparisonResult = {
    summary: string
    clauseChanges: {
        added: ClauseChange[]
        removed: ClauseChange[]
        modified: ClauseChange[]
    }
    dateChanges: DateChange[]
    amountChanges: AmountChange[]
    responsibilityChanges: ResponsibilityChange[]
    toneComparison: string
    risks: string[]
    recommendations: string[]
}

export type CompareDocumentsParams = {
    textA: string
    textB: string
    labelA?: string
    labelB?: string
    hint?: string
}

/**
 * Compare two documents and return structured differences
 */
export async function compareDocuments(params: CompareDocumentsParams): Promise<DocumentComparisonResult> {
    if (!AI_API_KEY) {
        throw new Error('AI configuration missing: AI_API_KEY is not set')
    }

    const { textA, textB, labelA = 'Document A (Original)', labelB = 'Document B (New Version)', hint } = params

    const prompt = `You are an expert document analyst and legal reviewer. Your task is to carefully compare two versions of a document and identify all meaningful differences.

CONTEXT:
- Document A (labeled "${labelA}") is the ORIGINAL/OLD version
- Document B (labeled "${labelB}") is the NEW/UPDATED version
${hint ? `- User hint about these documents: ${hint}` : ''}

DOCUMENT A (ORIGINAL):
---
${textA.substring(0, 12000)}
---

DOCUMENT B (NEW VERSION):
---
${textB.substring(0, 12000)}
---

ANALYSIS INSTRUCTIONS:
1. Compare the two documents systematically
2. Identify changes in: clauses/sections, dates, monetary amounts, responsibilities, and tone
3. Flag any potential risks or red flags introduced in the new version
4. Provide actionable recommendations

OUTPUT STRICT JSON ONLY in this exact format:
{
    "summary": "A 2-4 sentence summary of the overall changes between the documents",
    "clauseChanges": {
        "added": [
            {"title": "section name", "description": "what was added", "afterSnippet": "brief quote from new doc"}
        ],
        "removed": [
            {"title": "section name", "description": "what was removed", "beforeSnippet": "brief quote from old doc"}
        ],
        "modified": [
            {"title": "section name", "description": "how it changed", "beforeSnippet": "old text", "afterSnippet": "new text"}
        ]
    },
    "dateChanges": [
        {"field": "name of date field", "oldValue": "old date", "newValue": "new date", "description": "impact of change"}
    ],
    "amountChanges": [
        {"field": "salary/fee/budget/etc", "oldValue": "$X", "newValue": "$Y", "description": "context", "significance": "minor|moderate|major"}
    ],
    "responsibilityChanges": [
        {"party": "Company/Employee/Client/etc", "change": "added|removed|modified", "description": "what changed"}
    ],
    "toneComparison": "Description of how the tone/formality/strictness changed between documents",
    "risks": [
        "List of potential risks or red flags introduced in the new document"
    ],
    "recommendations": [
        "Actionable advice based on the comparison"
    ]
}

CRITICAL RULES:
- Output ONLY valid JSON, nothing else
- No markdown code blocks, no comments, no extra text
- If no changes exist in a category, use empty arrays []
- Keep snippets brief (under 100 characters)
- Be specific and precise about changes`

    try {
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
                        temperature: 0.2,
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
        let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!jsonText) {
            throw new Error('No comparison generated from AI')
        }

        jsonText = jsonText.trim()

        // Try to parse JSON
        let parsed: DocumentComparisonResult | null = null
        try {
            parsed = JSON.parse(jsonText)
        } catch (e) {
            // Try to extract JSON from markdown code blocks if present
            const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[1])
                } catch (e2) {
                    throw new Error('Failed to parse comparison JSON from AI response')
                }
            } else {
                throw new Error('Failed to parse comparison JSON from AI response')
            }
        }

        if (!parsed) {
            throw new Error('Failed to parse comparison result')
        }

        // Ensure all required fields exist with defaults
        return {
            summary: parsed.summary || 'No summary available',
            clauseChanges: {
                added: parsed.clauseChanges?.added || [],
                removed: parsed.clauseChanges?.removed || [],
                modified: parsed.clauseChanges?.modified || [],
            },
            dateChanges: parsed.dateChanges || [],
            amountChanges: parsed.amountChanges || [],
            responsibilityChanges: parsed.responsibilityChanges || [],
            toneComparison: parsed.toneComparison || 'No significant tone changes detected',
            risks: parsed.risks || [],
            recommendations: parsed.recommendations || [],
        }

    } catch (error: any) {
        console.error('Document comparison error:', error)
        throw new Error(`Failed to compare documents: ${error.message}`)
    }
}
