// FILE: src/lib/pdf-utils.ts

/**
 * Shared PDF text extraction utility
 * Used by both single-document analysis and two-document comparison features
 */

export type PDFExtractionResult = {
    success: true
    text: string
    filename: string
} | {
    success: false
    error: string
    filename: string
}

export const MAX_PDF_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Validate a PDF file before extraction
 */
export function validatePDFFile(file: File): { valid: true } | { valid: false; error: string } {
    if (!file) {
        return { valid: false, error: 'No file provided' }
    }

    if (file.type !== 'application/pdf') {
        return { valid: false, error: `Invalid file type: ${file.type}. Please upload a PDF file.` }
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
        return { valid: false, error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of 5MB` }
    }

    return { valid: true }
}

/**
 * Extract text from a PDF file
 * Returns success with text or error with message
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
    const filename = file.name

    try {
        // Validate file first
        const validation = validatePDFFile(file)
        if (!validation.valid) {
            return { success: false, error: validation.error, filename }
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log(`🔄 Extracting text from PDF: ${filename}`)

        // pdf-parse v2.x uses PDFParse class
        const pdfParseModule = await import('pdf-parse') as any
        const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse

        if (!PDFParse) {
            throw new Error('PDFParse class not found in pdf-parse module')
        }

        // Create parser instance with buffer data
        const parser = new PDFParse({ data: buffer })

        // Load the PDF first (required before getText)
        await parser.load()

        // Extract text from PDF
        const textResult = await parser.getText()

        // Handle different return types
        let extractedText: string
        if (typeof textResult === 'string') {
            extractedText = textResult
        } else if (textResult && typeof textResult === 'object') {
            extractedText = textResult.text || textResult.join?.('\n') || JSON.stringify(textResult)
        } else {
            extractedText = String(textResult || '')
        }

        console.log(`✅ Extracted ${extractedText.length} characters from ${filename}`)

        // Validate extracted text has meaningful content
        if (!extractedText || extractedText.trim().length < 50) {
            return {
                success: false,
                error: 'Could not extract enough text from this PDF. The file may be scanned images or protected.',
                filename
            }
        }

        return { success: true, text: extractedText.trim(), filename }

    } catch (error: any) {
        console.error(`❌ PDF extraction error for ${filename}:`, error)
        return {
            success: false,
            error: `Failed to parse PDF: ${error.message}`,
            filename
        }
    }
}

/**
 * Extract text from multiple PDF files
 * Returns array of results in the same order as input
 */
export async function extractTextFromMultiplePDFs(files: File[]): Promise<PDFExtractionResult[]> {
    return Promise.all(files.map(file => extractTextFromPDF(file)))
}
