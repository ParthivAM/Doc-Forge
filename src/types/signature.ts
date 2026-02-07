// FILE: src/types/signature.ts

export type SignatureType = 'drawn' | 'uploaded' | 'typed'

export interface Signature {
    id: string
    owner_id: string
    signature_type: SignatureType
    display_name: string
    role_title?: string
    storage_path?: string
    is_default: boolean
    created_at: string
    updated_at: string
}

export interface DocumentSignature {
    signedByUserId: string
    signedByName: string
    signedByRole?: string
    signedAt: string
    signatureId: string
    signatureImageUrl?: string
}

export interface CreateSignatureRequest {
    signature_type: SignatureType
    display_name: string
    role_title?: string
    // For typed signatures, no image needed
    // For uploaded/drawn, base64 image data is sent
    image_data?: string
}

export interface SignDocumentRequest {
    docId: string
    signatureId: string
    displayName: string
    roleTitle?: string
}
