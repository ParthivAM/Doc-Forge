// FILE: src/lib/pdf-signature.ts
import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib'

export interface SignatureBlockData {
    signedByName: string
    signedByRole?: string
    signedAt: string
    signatureImageUrl?: string
    signatureType: 'drawn' | 'uploaded' | 'typed'
}

/**
 * Draw an elegant signature block on a PDF page
 * Positioned at the bottom of the page, separated from content
 */
export async function drawSignatureBlock(
    pdfDoc: PDFDocument,
    page: PDFPage,
    signatureData: SignatureBlockData,
    fonts: {
        bodyFont: PDFFont
        italicFont: PDFFont
        boldFont: PDFFont
    },
    options: {
        position?: 'bottom-right' | 'bottom-center' | 'bottom-left'
        margin?: number
        yOffset?: number
    } = {}
): Promise<void> {
    console.log('🖊️ Drawing signature block...')

    const { width } = page.getSize()
    const margin = options.margin ?? 50
    const position = options.position ?? 'bottom-right'

    // Signature block dimensions
    const blockWidth = 180
    const blockHeight = 75

    // Fixed position at the very bottom of the page (above footer)
    const bottomY = 45  // Just above the footer

    // Calculate X position based on alignment
    let startX: number
    switch (position) {
        case 'bottom-left':
            startX = margin
            break
        case 'bottom-center':
            startX = (width - blockWidth) / 2
            break
        case 'bottom-right':
        default:
            startX = width - margin - blockWidth
            break
    }

    // Format the date nicely
    const formattedDate = new Date(signatureData.signedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })

    // ===== DRAW SIGNATURE BLOCK =====

    // Starting Y position for content (from bottom up)
    let contentY = bottomY + blockHeight - 10

    // --- Draw the signature (image or typed name) ---
    if (signatureData.signatureImageUrl &&
        (signatureData.signatureType === 'drawn' || signatureData.signatureType === 'uploaded')) {
        // Image-based signature
        try {
            const imageResponse = await fetch(signatureData.signatureImageUrl)
            if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                const imageBytes = new Uint8Array(imageBuffer)

                let image
                try {
                    image = await pdfDoc.embedPng(imageBytes)
                } catch {
                    try {
                        image = await pdfDoc.embedJpg(imageBytes)
                    } catch {
                        console.warn('Could not embed signature image')
                    }
                }

                if (image) {
                    const maxWidth = blockWidth - 20
                    const maxHeight = 28
                    const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
                    const scaledWidth = image.width * scale
                    const scaledHeight = image.height * scale

                    page.drawImage(image, {
                        x: startX + (blockWidth - scaledWidth) / 2,
                        y: contentY - scaledHeight,
                        width: scaledWidth,
                        height: scaledHeight,
                    })
                    contentY -= scaledHeight + 2
                }
            }
        } catch (error) {
            console.warn('Failed to fetch signature image:', error)
        }
    } else if (signatureData.signatureType === 'typed') {
        // Typed signature - elegant cursive-like style
        const signatureText = signatureData.signedByName
        const signatureSize = 18
        const textWidth = fonts.italicFont.widthOfTextAtSize(signatureText, signatureSize)

        page.drawText(signatureText, {
            x: startX + (blockWidth - textWidth) / 2,
            y: contentY - 15,
            size: signatureSize,
            font: fonts.italicFont,
            color: rgb(0.15, 0.15, 0.25),
        })
        contentY -= 22
    }

    // --- Draw the signature line ---
    page.drawLine({
        start: { x: startX, y: contentY },
        end: { x: startX + blockWidth, y: contentY },
        thickness: 0.75,
        color: rgb(0.4, 0.4, 0.45),
    })
    contentY -= 12

    // --- Draw signer info (compact layout) ---
    // Name in bold
    const nameSize = 9
    const nameWidth = fonts.boldFont.widthOfTextAtSize(signatureData.signedByName, nameSize)
    page.drawText(signatureData.signedByName, {
        x: startX + (blockWidth - nameWidth) / 2,
        y: contentY,
        size: nameSize,
        font: fonts.boldFont,
        color: rgb(0.2, 0.2, 0.25),
    })
    contentY -= 10

    // Role (if provided) - smaller and muted
    if (signatureData.signedByRole) {
        const roleSize = 8
        const roleWidth = fonts.italicFont.widthOfTextAtSize(signatureData.signedByRole, roleSize)
        page.drawText(signatureData.signedByRole, {
            x: startX + (blockWidth - roleWidth) / 2,
            y: contentY,
            size: roleSize,
            font: fonts.italicFont,
            color: rgb(0.45, 0.45, 0.5),
        })
        contentY -= 10
    }

    // Date - smallest, subtle
    const dateSize = 7
    const dateWidth = fonts.bodyFont.widthOfTextAtSize(formattedDate, dateSize)
    page.drawText(formattedDate, {
        x: startX + (blockWidth - dateWidth) / 2,
        y: contentY,
        size: dateSize,
        font: fonts.bodyFont,
        color: rgb(0.5, 0.5, 0.55),
    })
}

/**
 * Determine signature block position based on template type
 */
export function getSignaturePosition(templateId?: string): 'bottom-right' | 'bottom-center' | 'bottom-left' {
    // Certificates look better with centered signatures
    if (templateId === 'certificate_completion' ||
        templateId === 'offer_letter' ||
        templateId === 'experience_letter') {
        return 'bottom-center'
    }

    // Contracts and other docs - right aligned
    if (templateId === 'contract_skeleton') {
        return 'bottom-right'
    }

    // Default to bottom-right for most documents
    return 'bottom-right'
}
