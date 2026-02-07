import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { drawSignatureBlock, getSignaturePosition, SignatureBlockData } from '@/lib/pdf-signature'

// Clean markdown from text
function cleanMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/^[-*]\s+/gm, '• ')
        .replace(/^\d+\.\s+/gm, (match) => match)
}

function wrapText(
    text: string,
    maxWidth: number,
    font: PDFFont,
    fontSize: number
): string[] {
    const cleanText = cleanMarkdown(text)
    const words = cleanText.split(/\s+/)
    const lines: string[] = []
    let currentLine = ""

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)
        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
        } else {
            currentLine = testLine
        }
    }

    if (currentLine) lines.push(currentLine)
    return lines
}

function drawFormattedContent(
    page: PDFPage,
    content: string,
    startY: number,
    options: {
        margin: number
        usableWidth: number
        bodyFont: PDFFont
        bodySize: number
        lineHeight: number
        minY: number
        centered?: boolean
        pageWidth: number
    }
): number {
    let cursorY = startY
    const { margin, usableWidth, bodyFont, bodySize, lineHeight, minY, centered, pageWidth } = options

    const paragraphs = content.split(/\n\n+/)

    for (const para of paragraphs) {
        if (cursorY < minY) break

        const cleanPara = cleanMarkdown(para).trim()
        if (!cleanPara) continue

        const lines = wrapText(cleanPara, usableWidth, bodyFont, bodySize)

        for (const line of lines) {
            if (cursorY < minY) break

            let x = margin
            if (centered) {
                const lineWidth = bodyFont.widthOfTextAtSize(line, bodySize)
                x = (pageWidth - lineWidth) / 2
            }

            page.drawText(line, {
                x,
                y: cursorY,
                size: bodySize,
                font: bodyFont,
                color: rgb(0.2, 0.2, 0.3),
            })
            cursorY -= lineHeight
        }
        cursorY -= lineHeight * 0.3
    }

    return cursorY
}

export async function GET(
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

        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('id, doc_id, title, owner_id, created_at, metadata')
            .eq('doc_id', params.docId)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        if (data.owner_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const title = data.title ?? "Untitled Document"
        const createdAt = data.created_at
        const docPublicId = data.doc_id
        const metadata = (data.metadata || {}) as any
        const content: string = metadata.content ?? ""
        const templateId: string | undefined = metadata.templateId
        const fields: Record<string, string> | undefined = metadata.fields ?? undefined
        const signatureData = metadata.signature as SignatureBlockData | undefined

        console.log('📄 PDF Generation - Template:', templateId)

        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()
        const margin = 50
        const usableWidth = width - margin * 2

        const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

        const signatureReservedHeight = signatureData ? 100 : 0
        const contentMinY = margin + 50 + signatureReservedHeight

        let cursorY = height - margin - 20

        // ============ CERTIFICATE TEMPLATE ============
        if (templateId === 'certificate_completion') {
            // Decorative double border
            page.drawRectangle({
                x: margin / 2,
                y: margin / 2,
                width: width - margin,
                height: height - margin,
                borderColor: rgb(0.75, 0.65, 0.45),
                borderWidth: 3,
            })
            page.drawRectangle({
                x: margin / 2 + 8,
                y: margin / 2 + 8,
                width: width - margin - 16,
                height: height - margin - 16,
                borderColor: rgb(0.85, 0.78, 0.6),
                borderWidth: 1,
            })

            cursorY = height - 80
            const headerText = 'CERTIFICATE OF COMPLETION'
            const headerSize = 22
            const headerWidth = titleFont.widthOfTextAtSize(headerText, headerSize)
            page.drawText(headerText, {
                x: (width - headerWidth) / 2,
                y: cursorY,
                size: headerSize,
                font: titleFont,
                color: rgb(0.25, 0.2, 0.15),
            })

            cursorY -= 15
            page.drawLine({
                start: { x: (width - 200) / 2, y: cursorY },
                end: { x: (width + 200) / 2, y: cursorY },
                thickness: 1.5,
                color: rgb(0.75, 0.65, 0.45),
            })

            cursorY -= 40
            const introText = "This is to certify that"
            const introWidth = italicFont.widthOfTextAtSize(introText, 12)
            page.drawText(introText, {
                x: (width - introWidth) / 2,
                y: cursorY,
                size: 12,
                font: italicFont,
                color: rgb(0.35, 0.35, 0.4),
            })

            cursorY -= 35
            const recipient = fields?.recipient_name ?? ""
            if (recipient) {
                const recipientWidth = titleFont.widthOfTextAtSize(recipient, 28)
                page.drawText(recipient, {
                    x: (width - recipientWidth) / 2,
                    y: cursorY,
                    size: 28,
                    font: titleFont,
                    color: rgb(0.15, 0.15, 0.2),
                })
                cursorY -= 50
            }

            cursorY = drawFormattedContent(page, content, cursorY, {
                margin: margin + 20,
                usableWidth: usableWidth - 40,
                bodyFont,
                bodySize: 11,
                lineHeight: 20,
                minY: contentMinY,
                centered: true,
                pageWidth: width,
            })

            const issuer = fields?.issuer_name ?? fields?.company_name ?? ""
            const issuerY = signatureData ? margin + signatureReservedHeight + 30 : margin + 60
            if (issuer) {
                const issuerText = `Issued by: ${issuer}`
                const issuerWidth = italicFont.widthOfTextAtSize(issuerText, 11)
                page.drawText(issuerText, {
                    x: (width - issuerWidth) / 2,
                    y: issuerY,
                    size: 11,
                    font: italicFont,
                    color: rgb(0.4, 0.4, 0.5),
                })
            }
        }
        // ============ OFFER LETTER TEMPLATE ============
        else if (templateId === 'offer_letter') {
            // Company header area
            page.drawRectangle({
                x: 0, y: height - 80,
                width, height: 80,
                color: rgb(0.15, 0.2, 0.35),
            })

            const companyName = fields?.company_name ?? 'Company'
            const companyWidth = titleFont.widthOfTextAtSize(companyName, 20)
            page.drawText(companyName, {
                x: (width - companyWidth) / 2,
                y: height - 50,
                size: 20,
                font: titleFont,
                color: rgb(1, 1, 1),
            })

            cursorY = height - 110
            page.drawText('OFFER LETTER', {
                x: margin, y: cursorY,
                size: 16, font: titleFont,
                color: rgb(0.15, 0.2, 0.35),
            })

            cursorY -= 30
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(`Date: ${dateStr}`, {
                x: margin, y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 25
            const candidate = fields?.candidate_name ?? ""
            if (candidate) {
                page.drawText(`Dear ${candidate},`, {
                    x: margin, y: cursorY,
                    size: 11, font: bodyFont,
                    color: rgb(0.2, 0.2, 0.3),
                })
                cursorY -= 25
            }

            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 18,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ EXPERIENCE LETTER TEMPLATE ============
        else if (templateId === 'experience_letter') {
            // Formal letterhead
            const companyName = fields?.company_name ?? 'Organization'
            const companyWidth = titleFont.widthOfTextAtSize(companyName, 18)
            page.drawText(companyName, {
                x: (width - companyWidth) / 2,
                y: height - 50,
                size: 18,
                font: titleFont,
                color: rgb(0.2, 0.25, 0.35),
            })

            page.drawLine({
                start: { x: margin, y: height - 65 },
                end: { x: width - margin, y: height - 65 },
                thickness: 1,
                color: rgb(0.3, 0.35, 0.45),
            })

            cursorY = height - 100
            page.drawText('EXPERIENCE LETTER', {
                x: margin, y: cursorY,
                size: 14, font: titleFont,
                color: rgb(0.2, 0.25, 0.35),
            })

            cursorY -= 30
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(`Date: ${dateStr}`, {
                x: margin, y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 25
            page.drawText('To Whom It May Concern,', {
                x: margin, y: cursorY,
                size: 11, font: italicFont,
                color: rgb(0.3, 0.3, 0.35),
            })

            cursorY -= 25
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 18,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ BUSINESS EMAIL/LETTER TEMPLATE ============
        else if (templateId === 'business_email_letter') {
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(dateStr, {
                x: width - margin - bodyFont.widthOfTextAtSize(dateStr, 10),
                y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 30
            page.drawText(title, {
                x: margin, y: cursorY,
                size: 16, font: titleFont,
                color: rgb(0.15, 0.18, 0.25),
            })

            cursorY -= 25
            const audience = fields?.audience ?? ""
            if (audience) {
                page.drawText(`To: ${audience}`, {
                    x: margin, y: cursorY,
                    size: 11, font: bodyFont,
                    color: rgb(0.3, 0.32, 0.4),
                })
                cursorY -= 20
            }

            const topic = fields?.topic ?? ""
            if (topic) {
                page.drawText(`Re: ${topic}`, {
                    x: margin, y: cursorY,
                    size: 11, font: italicFont,
                    color: rgb(0.4, 0.4, 0.45),
                })
                cursorY -= 25
            }

            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ BUSINESS REPORT TEMPLATE ============
        else if (templateId === 'business_report') {
            page.drawRectangle({
                x: 0, y: height - 70,
                width, height: 70,
                color: rgb(0.96, 0.95, 0.92),
            })

            page.drawText(title, {
                x: margin, y: height - 40,
                size: 18, font: titleFont,
                color: rgb(0.15, 0.18, 0.25),
            })

            const period = fields?.period ?? ""
            const topic = fields?.topic ?? ""
            const metaLine = [period, topic].filter(Boolean).join(" • ")
            if (metaLine) {
                page.drawText(metaLine, {
                    x: margin, y: height - 58,
                    size: 10, font: bodyFont,
                    color: rgb(0.4, 0.42, 0.5),
                })
            }

            cursorY = height - 100
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ PROPOSAL/QUOTATION TEMPLATE ============
        else if (templateId === 'proposal_quotation') {
            // Professional proposal header
            page.drawRectangle({
                x: 0, y: height - 90,
                width, height: 90,
                color: rgb(0.12, 0.15, 0.25),
            })

            page.drawText('PROPOSAL', {
                x: margin, y: height - 45,
                size: 24, font: titleFont,
                color: rgb(1, 1, 1),
            })

            const projectName = fields?.project_or_service ?? title
            page.drawText(projectName, {
                x: margin, y: height - 70,
                size: 12, font: bodyFont,
                color: rgb(0.8, 0.82, 0.88),
            })

            cursorY = height - 120
            const client = fields?.client_or_stakeholder ?? ""
            if (client) {
                page.drawText(`Prepared for: ${client}`, {
                    x: margin, y: cursorY,
                    size: 11, font: italicFont,
                    color: rgb(0.4, 0.4, 0.45),
                })
                cursorY -= 20
            }

            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(`Date: ${dateStr}`, {
                x: margin, y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 30
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ POLICY/SOP/MANUAL TEMPLATE ============
        else if (templateId === 'policy_sop_manual') {
            // Document control header
            page.drawRectangle({
                x: margin, y: height - 80,
                width: usableWidth, height: 60,
                color: rgb(0.95, 0.95, 0.96),
                borderColor: rgb(0.8, 0.8, 0.82),
                borderWidth: 1,
            })

            const docType = fields?.doc_type ?? 'PROCEDURE'
            page.drawText(docType.toUpperCase(), {
                x: margin + 15, y: height - 45,
                size: 10, font: titleFont,
                color: rgb(0.4, 0.4, 0.45),
            })

            page.drawText(title, {
                x: margin + 15, y: height - 62,
                size: 14, font: titleFont,
                color: rgb(0.15, 0.18, 0.25),
            })

            cursorY = height - 110

            const dept = fields?.department ?? ""
            if (dept) {
                page.drawText(`Department: ${dept}`, {
                    x: margin, y: cursorY,
                    size: 10, font: bodyFont,
                    color: rgb(0.5, 0.5, 0.55),
                })
                cursorY -= 15
            }

            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(`Effective Date: ${dateStr}`, {
                x: margin, y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 25
            page.drawLine({
                start: { x: margin, y: cursorY },
                end: { x: width - margin, y: cursorY },
                thickness: 0.5, color: rgb(0.85, 0.85, 0.88),
            })

            cursorY -= 20
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 10, lineHeight: 16,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ CONTRACT TEMPLATE ============
        else if (templateId === 'contract_skeleton') {
            page.drawText(title.toUpperCase(), {
                x: margin, y: cursorY,
                size: 16, font: titleFont,
                color: rgb(0.15, 0.15, 0.2),
            })

            cursorY -= 25
            page.drawLine({
                start: { x: margin, y: cursorY },
                end: { x: width - margin, y: cursorY },
                thickness: 1.5, color: rgb(0.2, 0.2, 0.25),
            })

            cursorY -= 25
            const partyA = fields?.party_a ?? ""
            const partyB = fields?.party_b ?? ""
            if (partyA || partyB) {
                const partiesText = `Between: ${partyA} ("Party A") and ${partyB} ("Party B")`
                page.drawText(partiesText, {
                    x: margin, y: cursorY,
                    size: 10, font: italicFont,
                    color: rgb(0.35, 0.35, 0.4),
                })
                cursorY -= 20
            }

            const effectiveDate = fields?.effective_date ?? ""
            if (effectiveDate) {
                page.drawText(`Effective Date: ${effectiveDate}`, {
                    x: margin, y: cursorY,
                    size: 10, font: bodyFont,
                    color: rgb(0.5, 0.5, 0.55),
                })
                cursorY -= 25
            }

            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 10, lineHeight: 16,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ FINANCIAL SUMMARY TEMPLATE ============
        else if (templateId === 'financial_summary') {
            page.drawRectangle({
                x: 0, y: height - 75,
                width, height: 75,
                color: rgb(0.1, 0.3, 0.2),
            })

            page.drawText('FINANCIAL SUMMARY', {
                x: margin, y: height - 40,
                size: 18, font: titleFont,
                color: rgb(1, 1, 1),
            })

            const period = fields?.period ?? ""
            const company = fields?.company_or_unit ?? ""
            const subLine = [period, company].filter(Boolean).join(" | ")
            if (subLine) {
                page.drawText(subLine, {
                    x: margin, y: height - 58,
                    size: 11, font: bodyFont,
                    color: rgb(0.85, 0.9, 0.87),
                })
            }

            cursorY = height - 100
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ MARKETING BRIEF TEMPLATE ============
        else if (templateId === 'marketing_brief') {
            page.drawRectangle({
                x: 0, y: height - 85,
                width, height: 85,
                color: rgb(0.9, 0.35, 0.4),
            })

            page.drawText('CAMPAIGN BRIEF', {
                x: margin, y: height - 42,
                size: 20, font: titleFont,
                color: rgb(1, 1, 1),
            })

            const campaign = fields?.channel_or_campaign ?? title
            page.drawText(campaign, {
                x: margin, y: height - 65,
                size: 12, font: bodyFont,
                color: rgb(1, 0.9, 0.9),
            })

            cursorY = height - 110

            const target = fields?.target_segment ?? ""
            if (target) {
                page.drawText(`Target: ${target}`, {
                    x: margin, y: cursorY,
                    size: 10, font: italicFont,
                    color: rgb(0.4, 0.4, 0.45),
                })
                cursorY -= 20
            }

            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }
        // ============ DEFAULT / CUSTOM FREEFORM TEMPLATE ============
        else {
            page.drawText(title, {
                x: margin, y: cursorY,
                size: 18, font: titleFont,
                color: rgb(0.15, 0.18, 0.25),
            })

            cursorY -= 10
            page.drawLine({
                start: { x: margin, y: cursorY },
                end: { x: width - margin, y: cursorY },
                thickness: 0.5, color: rgb(0.85, 0.85, 0.88),
            })

            cursorY -= 25
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(dateStr, {
                x: margin, y: cursorY,
                size: 10, font: bodyFont,
                color: rgb(0.5, 0.5, 0.55),
            })

            cursorY -= 25
            cursorY = drawFormattedContent(page, content, cursorY, {
                margin, usableWidth: usableWidth * 0.95, bodyFont, bodySize: 11, lineHeight: 17,
                minY: contentMinY, pageWidth: width,
            })
        }

        // Draw signature block
        if (signatureData) {
            await drawSignatureBlock(pdfDoc, page, signatureData,
                { bodyFont, italicFont, boldFont: titleFont },
                { position: getSignaturePosition(templateId), margin }
            )
        }

        // Footer
        const footerText = signatureData ? "Generated & Signed with DocVerify" : "Generated with DocVerify"
        const footerWidth = italicFont.widthOfTextAtSize(footerText, 9)
        page.drawText(footerText, {
            x: (width - footerWidth) / 2, y: 20,
            size: 9, font: italicFont, color: rgb(0.6, 0.62, 0.7),
        })

        const pdfBytes = await pdfDoc.save()
        const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "document"
        const safeFileName = `${safeTitle}_${docPublicId.slice(0, 8)}`

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${safeFileName}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('PDF generation error:', error)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
