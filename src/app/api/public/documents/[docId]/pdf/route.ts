// FILE: src/app/api/public/documents/[docId]/pdf/route.ts
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib"
import { drawSignatureBlock, getSignaturePosition, SignatureBlockData } from '@/lib/pdf-signature'

function cleanMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/^#+\s*/gm, '')
        .replace(/^[-*]\s+/gm, '• ')
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
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
    page: PDFPage, content: string, startY: number,
    options: { margin: number; usableWidth: number; bodyFont: PDFFont; bodySize: number; lineHeight: number; minY: number; centered?: boolean; pageWidth: number }
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
            page.drawText(line, { x, y: cursorY, size: bodySize, font: bodyFont, color: rgb(0.2, 0.2, 0.3) })
            cursorY -= lineHeight
        }
        cursorY -= lineHeight * 0.3
    }
    return cursorY
}

export async function GET(request: Request, { params }: { params: { docId: string } }) {
    try {
        const { data, error } = await supabaseAdmin
            .from("documents")
            .select("doc_id, title, created_at, metadata")
            .eq("doc_id", params.docId)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        const metadata = (data.metadata as any) ?? {}
        if (metadata.isPublic !== true) {
            return NextResponse.json({ error: "Document is not public" }, { status: 403 })
        }

        const title = data.title ?? "Untitled Document"
        const createdAt = data.created_at
        const docPublicId = data.doc_id
        const content: string = metadata.content ?? ""
        const templateId: string | undefined = metadata.templateId
        const fields: Record<string, string> | undefined = metadata.fields ?? undefined
        const signatureData = metadata.signature as SignatureBlockData | undefined

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

        // Template-specific layouts (same as private route)
        if (templateId === 'certificate_completion') {
            page.drawRectangle({ x: margin / 2, y: margin / 2, width: width - margin, height: height - margin, borderColor: rgb(0.75, 0.65, 0.45), borderWidth: 3 })
            page.drawRectangle({ x: margin / 2 + 8, y: margin / 2 + 8, width: width - margin - 16, height: height - margin - 16, borderColor: rgb(0.85, 0.78, 0.6), borderWidth: 1 })
            cursorY = height - 80
            const headerText = 'CERTIFICATE OF COMPLETION'
            page.drawText(headerText, { x: (width - titleFont.widthOfTextAtSize(headerText, 22)) / 2, y: cursorY, size: 22, font: titleFont, color: rgb(0.25, 0.2, 0.15) })
            cursorY -= 15
            page.drawLine({ start: { x: (width - 200) / 2, y: cursorY }, end: { x: (width + 200) / 2, y: cursorY }, thickness: 1.5, color: rgb(0.75, 0.65, 0.45) })
            cursorY -= 40
            const introText = "This is to certify that"
            page.drawText(introText, { x: (width - italicFont.widthOfTextAtSize(introText, 12)) / 2, y: cursorY, size: 12, font: italicFont, color: rgb(0.35, 0.35, 0.4) })
            cursorY -= 35
            const recipient = fields?.recipient_name ?? ""
            if (recipient) { page.drawText(recipient, { x: (width - titleFont.widthOfTextAtSize(recipient, 28)) / 2, y: cursorY, size: 28, font: titleFont, color: rgb(0.15, 0.15, 0.2) }); cursorY -= 50 }
            cursorY = drawFormattedContent(page, content, cursorY, { margin: margin + 20, usableWidth: usableWidth - 40, bodyFont, bodySize: 11, lineHeight: 20, minY: contentMinY, centered: true, pageWidth: width })
            const issuer = fields?.issuer_name ?? fields?.company_name ?? ""
            if (issuer) { const issuerY = signatureData ? margin + signatureReservedHeight + 30 : margin + 60; page.drawText(`Issued by: ${issuer}`, { x: (width - italicFont.widthOfTextAtSize(`Issued by: ${issuer}`, 11)) / 2, y: issuerY, size: 11, font: italicFont, color: rgb(0.4, 0.4, 0.5) }) }
        }
        else if (templateId === 'offer_letter') {
            page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.15, 0.2, 0.35) })
            const companyName = fields?.company_name ?? 'Company'
            page.drawText(companyName, { x: (width - titleFont.widthOfTextAtSize(companyName, 20)) / 2, y: height - 50, size: 20, font: titleFont, color: rgb(1, 1, 1) })
            cursorY = height - 110
            page.drawText('OFFER LETTER', { x: margin, y: cursorY, size: 16, font: titleFont, color: rgb(0.15, 0.2, 0.35) })
            cursorY -= 30
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            page.drawText(`Date: ${dateStr}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) })
            cursorY -= 25
            const candidate = fields?.candidate_name ?? ""
            if (candidate) { page.drawText(`Dear ${candidate},`, { x: margin, y: cursorY, size: 11, font: bodyFont, color: rgb(0.2, 0.2, 0.3) }); cursorY -= 25 }
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 18, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'experience_letter') {
            const companyName = fields?.company_name ?? 'Organization'
            page.drawText(companyName, { x: (width - titleFont.widthOfTextAtSize(companyName, 18)) / 2, y: height - 50, size: 18, font: titleFont, color: rgb(0.2, 0.25, 0.35) })
            page.drawLine({ start: { x: margin, y: height - 65 }, end: { x: width - margin, y: height - 65 }, thickness: 1, color: rgb(0.3, 0.35, 0.45) })
            cursorY = height - 100
            page.drawText('EXPERIENCE LETTER', { x: margin, y: cursorY, size: 14, font: titleFont, color: rgb(0.2, 0.25, 0.35) })
            cursorY -= 30
            page.drawText(`Date: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) })
            cursorY -= 25
            page.drawText('To Whom It May Concern,', { x: margin, y: cursorY, size: 11, font: italicFont, color: rgb(0.3, 0.3, 0.35) })
            cursorY -= 25
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 18, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'business_report' || templateId === 'financial_summary') {
            const headerColor = templateId === 'financial_summary' ? rgb(0.1, 0.3, 0.2) : rgb(0.96, 0.95, 0.92)
            const textColor = templateId === 'financial_summary' ? rgb(1, 1, 1) : rgb(0.15, 0.18, 0.25)
            page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: headerColor })
            page.drawText(templateId === 'financial_summary' ? 'FINANCIAL SUMMARY' : title, { x: margin, y: height - 40, size: 18, font: titleFont, color: textColor })
            const period = fields?.period ?? ""
            const meta = fields?.company_or_unit ?? fields?.topic ?? ""
            if (period || meta) { page.drawText([period, meta].filter(Boolean).join(" • "), { x: margin, y: height - 58, size: 10, font: bodyFont, color: templateId === 'financial_summary' ? rgb(0.85, 0.9, 0.87) : rgb(0.4, 0.42, 0.5) }) }
            cursorY = height - 100
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'proposal_quotation') {
            page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.12, 0.15, 0.25) })
            page.drawText('PROPOSAL', { x: margin, y: height - 45, size: 24, font: titleFont, color: rgb(1, 1, 1) })
            page.drawText(fields?.project_or_service ?? title, { x: margin, y: height - 70, size: 12, font: bodyFont, color: rgb(0.8, 0.82, 0.88) })
            cursorY = height - 120
            const client = fields?.client_or_stakeholder ?? ""
            if (client) { page.drawText(`Prepared for: ${client}`, { x: margin, y: cursorY, size: 11, font: italicFont, color: rgb(0.4, 0.4, 0.45) }); cursorY -= 20 }
            page.drawText(`Date: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) })
            cursorY -= 30
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'policy_sop_manual') {
            page.drawRectangle({ x: margin, y: height - 80, width: usableWidth, height: 60, color: rgb(0.95, 0.95, 0.96), borderColor: rgb(0.8, 0.8, 0.82), borderWidth: 1 })
            page.drawText((fields?.doc_type ?? 'PROCEDURE').toUpperCase(), { x: margin + 15, y: height - 45, size: 10, font: titleFont, color: rgb(0.4, 0.4, 0.45) })
            page.drawText(title, { x: margin + 15, y: height - 62, size: 14, font: titleFont, color: rgb(0.15, 0.18, 0.25) })
            cursorY = height - 110
            if (fields?.department) { page.drawText(`Department: ${fields.department}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) }); cursorY -= 15 }
            page.drawText(`Effective Date: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) })
            cursorY -= 25
            page.drawLine({ start: { x: margin, y: cursorY }, end: { x: width - margin, y: cursorY }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) })
            cursorY -= 20
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 10, lineHeight: 16, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'contract_skeleton') {
            page.drawText(title.toUpperCase(), { x: margin, y: cursorY, size: 16, font: titleFont, color: rgb(0.15, 0.15, 0.2) })
            cursorY -= 25
            page.drawLine({ start: { x: margin, y: cursorY }, end: { x: width - margin, y: cursorY }, thickness: 1.5, color: rgb(0.2, 0.2, 0.25) })
            cursorY -= 25
            if (fields?.party_a || fields?.party_b) { page.drawText(`Between: ${fields?.party_a ?? ''} ("Party A") and ${fields?.party_b ?? ''} ("Party B")`, { x: margin, y: cursorY, size: 10, font: italicFont, color: rgb(0.35, 0.35, 0.4) }); cursorY -= 20 }
            if (fields?.effective_date) { page.drawText(`Effective Date: ${fields.effective_date}`, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) }); cursorY -= 25 }
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 10, lineHeight: 16, minY: contentMinY, pageWidth: width })
        }
        else if (templateId === 'marketing_brief') {
            page.drawRectangle({ x: 0, y: height - 85, width, height: 85, color: rgb(0.9, 0.35, 0.4) })
            page.drawText('CAMPAIGN BRIEF', { x: margin, y: height - 42, size: 20, font: titleFont, color: rgb(1, 1, 1) })
            page.drawText(fields?.channel_or_campaign ?? title, { x: margin, y: height - 65, size: 12, font: bodyFont, color: rgb(1, 0.9, 0.9) })
            cursorY = height - 110
            if (fields?.target_segment) { page.drawText(`Target: ${fields.target_segment}`, { x: margin, y: cursorY, size: 10, font: italicFont, color: rgb(0.4, 0.4, 0.45) }); cursorY -= 20 }
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth, bodyFont, bodySize: 11, lineHeight: 17, minY: contentMinY, pageWidth: width })
        }
        else {
            // Default / custom_freeform / business_email_letter
            const dateStr = new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            if (templateId === 'business_email_letter') {
                page.drawText(dateStr, { x: width - margin - bodyFont.widthOfTextAtSize(dateStr, 10), y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) })
                cursorY -= 30
            }
            page.drawText(title, { x: margin, y: cursorY, size: 18, font: titleFont, color: rgb(0.15, 0.18, 0.25) })
            cursorY -= 10
            page.drawLine({ start: { x: margin, y: cursorY }, end: { x: width - margin, y: cursorY }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) })
            cursorY -= 25
            if (templateId !== 'business_email_letter') { page.drawText(dateStr, { x: margin, y: cursorY, size: 10, font: bodyFont, color: rgb(0.5, 0.5, 0.55) }); cursorY -= 25 }
            if (fields?.audience) { page.drawText(`To: ${fields.audience}`, { x: margin, y: cursorY, size: 11, font: bodyFont, color: rgb(0.3, 0.32, 0.4) }); cursorY -= 20 }
            if (fields?.topic) { page.drawText(`Re: ${fields.topic}`, { x: margin, y: cursorY, size: 11, font: italicFont, color: rgb(0.4, 0.4, 0.45) }); cursorY -= 25 }
            cursorY = drawFormattedContent(page, content, cursorY, { margin, usableWidth: usableWidth * 0.95, bodyFont, bodySize: 11, lineHeight: 17, minY: contentMinY, pageWidth: width })
        }

        if (signatureData) {
            await drawSignatureBlock(pdfDoc, page, signatureData, { bodyFont, italicFont, boldFont: titleFont }, { position: getSignaturePosition(templateId), margin })
        }

        const footerText = signatureData ? "Public view - Signed with DocVerify" : "Public view - DocVerify"
        page.drawText(footerText, { x: (width - italicFont.widthOfTextAtSize(footerText, 9)) / 2, y: 20, size: 9, font: italicFont, color: rgb(0.6, 0.62, 0.7) })

        const pdfBytes = await pdfDoc.save()
        const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "document"
        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeTitle}_${docPublicId.slice(0, 8)}.pdf"` },
        })
    } catch (err: any) {
        console.error("Public PDF generation error:", err)
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }
}
