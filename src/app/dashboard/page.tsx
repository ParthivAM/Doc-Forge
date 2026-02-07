// FILE: src/app/dashboard/page.tsx
"use client"
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DOCUMENT_TEMPLATES } from '@/config/templates'
import type { DocumentAnalysisResult, DocumentComparisonResult } from '@/lib/ai'
import { extractTemplateFieldsFromAnalysis } from '@/lib/ai'

// Extended type to include extractedText from the API response
interface AnalysisResultWithText extends DocumentAnalysisResult {
    extractedText: string
}

interface Document {
    id: string
    doc_id: string
    title: string
    created_at: string
    hash: string
    isPublic: boolean
    signature?: {
        signedByUserId: string
        signedByName: string
        signedByRole?: string
        signedAt: string
        signatureId: string
    }
}

interface UserSignature {
    id: string
    signature_type: 'drawn' | 'uploaded' | 'typed'
    display_name: string
    role_title?: string
    is_default: boolean
    imageUrl?: string
    created_at: string
}

type RewriteMode =
    | "improve"
    | "formal"
    | "concise"
    | "friendly"
    | "expand"
    | "summarize"

export default function Dashboard() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState('custom_freeform')
    const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [context, setContext] = useState('')
    const [templateFields, setTemplateFields] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isRewriting, setIsRewriting] = useState<RewriteMode | null>(null)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Upload & Analysis state
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [uploadHint, setUploadHint] = useState('')
    const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<AnalysisResultWithText | null>(null)
    const [uploadError, setUploadError] = useState('')
    const [isRebuilding, setIsRebuilding] = useState(false)
    const [rebuildError, setRebuildError] = useState('')
    const [isAutoFilling, setIsAutoFilling] = useState(false)
    const [autoFillSuccess, setAutoFillSuccess] = useState('')

    // Compare Documents state
    const [compareFileA, setCompareFileA] = useState<File | null>(null)
    const [compareFileB, setCompareFileB] = useState<File | null>(null)
    const [compareHint, setCompareHint] = useState('')
    const [isComparing, setIsComparing] = useState(false)
    const [comparisonResult, setComparisonResult] = useState<{
        comparison: DocumentComparisonResult
        labelA: string
        labelB: string
    } | null>(null)
    const [compareError, setCompareError] = useState('')

    // Signature state
    const [signatures, setSignatures] = useState<UserSignature[]>([])
    const [isLoadingSignatures, setIsLoadingSignatures] = useState(false)
    const [showSignatureSettings, setShowSignatureSettings] = useState(false)
    const [showSignModal, setShowSignModal] = useState(false)
    const [signDocId, setSignDocId] = useState<string | null>(null)
    const [isSigning, setIsSigning] = useState(false)
    const [signatureFormData, setSignatureFormData] = useState({
        displayName: '',
        roleTitle: '',
        selectedSignatureId: '',
    })
    const [newSignatureForm, setNewSignatureForm] = useState({
        type: 'typed' as 'typed' | 'uploaded',
        displayName: '',
        roleTitle: '',
        imageData: '',
    })
    const [isCreatingSignature, setIsCreatingSignature] = useState(false)

    // Confirmation modal states
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean
        title: string
        message: string
        confirmText: string
        confirmStyle: 'danger' | 'primary'
        onConfirm: () => void
    }>({
        show: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        confirmStyle: 'primary',
        onConfirm: () => { },
    })

    // Usage stats for free tier limits
    const [usageStats, setUsageStats] = useState<{
        uploads: { used: number; limit: number; remaining: number }
        rebuilds: { used: number; limit: number; remaining: number }
        compares: { used: number; limit: number; remaining: number }
        documents: { used: number; limit: number; remaining: number }
    } | null>(null)

    const router = useRouter()
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedTemplate = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplateId)
    const isCustomFreeform = selectedTemplateId === 'custom_freeform'

    useEffect(() => {
        fetchDocuments()
        fetchUsageStats()
    }, [])

    useEffect(() => {
        if (selectedTemplate) {
            if (!title) {
                setTitle(selectedTemplate.suggestedTitle)
            }
            const newFields: Record<string, string> = {}
            selectedTemplate.fields.forEach(field => {
                newFields[field.id] = templateFields[field.id] || ''
            })
            setTemplateFields(newFields)
        }
    }, [selectedTemplateId])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsTemplateDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchDocuments = async () => {
        setIsLoading(true)
        const res = await fetch('/api/documents', {
            credentials: 'include'
        })
        if (res.ok) {
            const data = await res.json()
            setDocuments(data)
        } else {
            router.push('/login')
        }
        setIsLoading(false)
    }

    const fetchUsageStats = async () => {
        try {
            const res = await fetch('/api/usage', {
                credentials: 'include'
            })
            if (res.ok) {
                const data = await res.json()
                setUsageStats(data.usage)
            }
        } catch (err) {
            console.error('Failed to fetch usage stats:', err)
        }
    }

    const fetchSignatures = async () => {
        setIsLoadingSignatures(true)
        try {
            const res = await fetch('/api/signatures', {
                credentials: 'include'
            })
            if (res.ok) {
                const data = await res.json()
                setSignatures(data)
                // Set default signature in form
                const defaultSig = data.find((s: UserSignature) => s.is_default)
                if (defaultSig) {
                    setSignatureFormData(prev => ({
                        ...prev,
                        displayName: defaultSig.display_name,
                        roleTitle: defaultSig.role_title || '',
                        selectedSignatureId: defaultSig.id,
                    }))
                }
            }
        } catch (err) {
            console.error('Failed to fetch signatures:', err)
        }
        setIsLoadingSignatures(false)
    }

    useEffect(() => {
        fetchSignatures()
    }, [])

    const handleCreateSignature = async () => {
        if (!newSignatureForm.displayName.trim()) {
            setError('Please enter a display name')
            setTimeout(() => setError(''), 3000)
            return
        }

        setIsCreatingSignature(true)
        try {
            const res = await fetch('/api/signatures', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature_type: newSignatureForm.type,
                    display_name: newSignatureForm.displayName,
                    role_title: newSignatureForm.roleTitle || undefined,
                    image_data: newSignatureForm.imageData || undefined,
                }),
            })

            if (res.ok) {
                setSuccess('Signature created successfully!')
                setTimeout(() => setSuccess(''), 3000)
                setNewSignatureForm({
                    type: 'typed',
                    displayName: '',
                    roleTitle: '',
                    imageData: '',
                })
                fetchSignatures()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create signature')
                setTimeout(() => setError(''), 3000)
            }
        } catch (err: any) {
            setError('Failed to create signature')
            setTimeout(() => setError(''), 3000)
        }
        setIsCreatingSignature(false)
    }

    const handleDeleteSignature = async (signatureId: string) => {
        setConfirmModal({
            show: true,
            title: 'Delete Signature',
            message: 'Are you sure you want to delete this signature? This action cannot be undone.',
            confirmText: 'Delete',
            confirmStyle: 'danger',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/signatures/${signatureId}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    })

                    if (res.ok) {
                        setSuccess('Signature deleted')
                        setTimeout(() => setSuccess(''), 3000)
                        fetchSignatures()
                    } else {
                        setError('Failed to delete signature')
                        setTimeout(() => setError(''), 3000)
                    }
                } catch (err) {
                    setError('Failed to delete signature')
                    setTimeout(() => setError(''), 3000)
                }
            },
        })
    }

    const handleSetDefaultSignature = async (signatureId: string) => {
        try {
            const res = await fetch(`/api/signatures/${signatureId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_default: true }),
            })

            if (res.ok) {
                setSuccess('Default signature updated')
                setTimeout(() => setSuccess(''), 3000)
                fetchSignatures()
            }
        } catch (err) {
            setError('Failed to set default signature')
            setTimeout(() => setError(''), 3000)
        }
    }

    const openSignModal = (docId: string) => {
        const doc = documents.find(d => d.doc_id === docId)
        setSignDocId(docId)

        // Pre-fill from existing signature or default
        if (doc?.signature) {
            setSignatureFormData({
                displayName: doc.signature.signedByName,
                roleTitle: doc.signature.signedByRole || '',
                selectedSignatureId: doc.signature.signatureId,
            })
        } else {
            const defaultSig = signatures.find(s => s.is_default)
            if (defaultSig) {
                setSignatureFormData({
                    displayName: defaultSig.display_name,
                    roleTitle: defaultSig.role_title || '',
                    selectedSignatureId: defaultSig.id,
                })
            }
        }

        setShowSignModal(true)
    }

    const handleSignDocument = async () => {
        if (!signDocId || !signatureFormData.selectedSignatureId || !signatureFormData.displayName) {
            setError('Please select a signature and enter your name')
            setTimeout(() => setError(''), 3000)
            return
        }

        setIsSigning(true)
        try {
            const res = await fetch(`/api/documents/${signDocId}/sign`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signatureId: signatureFormData.selectedSignatureId,
                    displayName: signatureFormData.displayName,
                    roleTitle: signatureFormData.roleTitle || undefined,
                }),
            })

            if (res.ok) {
                setSuccess('Document signed successfully!')
                setTimeout(() => setSuccess(''), 3000)
                setShowSignModal(false)
                setSignDocId(null)
                fetchDocuments()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to sign document')
                setTimeout(() => setError(''), 3000)
            }
        } catch (err: any) {
            setError('Failed to sign document')
            setTimeout(() => setError(''), 3000)
        }
        setIsSigning(false)
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 500 * 1024) {
            setError('Image must be under 500KB')
            setTimeout(() => setError(''), 3000)
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            setNewSignatureForm(prev => ({
                ...prev,
                imageData: event.target?.result as string,
            }))
        }
        reader.readAsDataURL(file)
    }

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId)
        setIsTemplateDropdownOpen(false)
    }

    const handleFieldChange = (fieldId: string, value: string) => {
        setTemplateFields(prev => ({ ...prev, [fieldId]: value }))
    }

    const handleGenerateWithAI = async () => {
        if (!title.trim()) {
            setError('Please enter a title first')
            setTimeout(() => setError(''), 3000)
            return
        }

        setIsGenerating(true)
        setError('')

        try {
            const res = await fetch('/api/ai/generate-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: title.trim(),
                    templateId: selectedTemplateId,
                    context: context.trim() || undefined,
                    fields: templateFields,
                    existingContent: content.trim() || undefined,
                }),
            })

            if (res.ok) {
                const data: { content: string; detectedTemplateId?: string } = await res.json()
                setContent(data.content)

                // Auto-switch template if AI detected a different one
                if (data.detectedTemplateId && data.detectedTemplateId !== selectedTemplateId) {
                    const detectedTemplate = DOCUMENT_TEMPLATES.find(t => t.id === data.detectedTemplateId)
                    if (detectedTemplate) {
                        setSelectedTemplateId(data.detectedTemplateId)
                        // Reset fields for new template
                        const newFields: Record<string, string> = {}
                        for (const field of detectedTemplate.fields) {
                            newFields[field.id] = ''
                        }
                        setTemplateFields(newFields)
                        setSuccess(`Content generated and switched to ${detectedTemplate.name}!`)
                        setTimeout(() => setSuccess(''), 4000)
                    } else {
                        setSuccess('Content generated successfully!')
                        setTimeout(() => setSuccess(''), 3000)
                    }
                } else {
                    setSuccess('Content generated successfully!')
                    setTimeout(() => setSuccess(''), 3000)
                }
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to generate content')
                setTimeout(() => setError(''), 5000)
            }
        } catch (err: any) {
            setError('Failed to generate content')
            setTimeout(() => setError(''), 5000)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRewrite = async (mode: RewriteMode) => {
        if (!content.trim()) return
        setIsRewriting(mode)
        try {
            const res = await fetch("/api/ai/rewrite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({
                    content,
                    mode,
                    title: title || undefined,
                    templateId: selectedTemplateId || undefined,
                }),
            })

            if (!res.ok) {
                setError('Failed to rewrite content')
                setTimeout(() => setError(''), 5000)
                return
            }

            const data = await res.json()
            if (data?.content) {
                setContent(data.content)
                setSuccess('Content rewritten successfully!')
                setTimeout(() => setSuccess(''), 3000)
            }
        } catch (err) {
            console.error("Rewrite error", err)
            setError('Failed to rewrite content')
            setTimeout(() => setError(''), 5000)
        } finally {
            setIsRewriting(null)
        }
    }

    const handleSaveDocument = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim() || !content.trim()) {
            setError('Title and content are required')
            setTimeout(() => setError(''), 3000)
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    templateId: selectedTemplateId,
                    fields: templateFields
                }),
            })

            if (res.ok) {
                const newDoc = await res.json()
                setDocuments([newDoc, ...documents])
                setContent('')
                setContext('')
                setSuccess('Document saved successfully!')
                setTimeout(() => setSuccess(''), 3000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save document')
                setTimeout(() => setError(''), 5000)
            }
        } catch (err: any) {
            setError('Failed to save document')
            setTimeout(() => setError(''), 5000)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTogglePublic = async (docId: string, isPublic: boolean) => {
        try {
            const res = await fetch(`/api/documents/${docId}/visibility`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ isPublic }),
            })

            if (!res.ok) {
                setError('Failed to update visibility')
                setTimeout(() => setError(''), 5000)
                return
            }

            setDocuments((prev) =>
                prev.map((d) =>
                    d.doc_id === docId ? { ...d, isPublic } : d
                )
            )
            setSuccess(isPublic ? 'Document is now public!' : 'Document is now private')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error("Error updating visibility", err)
            setError('Failed to update visibility')
            setTimeout(() => setError(''), 5000)
        }
    }

    const handleCopyLink = async (docId: string) => {
        if (typeof window === "undefined") return
        const origin = window.location.origin
        const url = `${origin}/d/${docId}`
        try {
            await navigator.clipboard.writeText(url)
            setSuccess('Link copied to clipboard!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error("Failed to copy link", err)
            setError('Failed to copy link')
            setTimeout(() => setError(''), 5000)
        }
    }

    const handleDeleteDocument = async (docId: string) => {
        setConfirmModal({
            show: true,
            title: 'Delete Document',
            message: 'Are you sure you want to delete this document? This action cannot be undone and the document will be permanently removed.',
            confirmText: 'Delete Document',
            confirmStyle: 'danger',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/documents/${docId}`, {
                        method: "DELETE",
                        credentials: 'include',
                    })

                    if (!res.ok) {
                        const data = await res.json()
                        setError(data.error || 'Failed to delete document')
                        setTimeout(() => setError(''), 5000)
                        return
                    }

                    setDocuments((prev) => prev.filter((d) => d.doc_id !== docId))
                    setSuccess('Document deleted successfully!')
                    setTimeout(() => setSuccess(''), 3000)
                } catch (e) {
                    console.error("Error deleting document", e)
                    setError('Failed to delete document')
                    setTimeout(() => setError(''), 5000)
                }
            },
        })
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        })
        router.push('/login')
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setSuccess('Copied to clipboard!')
        setTimeout(() => setSuccess(''), 2000)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setUploadFile(file)
            setAnalysisResult(null)
            setUploadError('')
        }
    }

    const handleAnalyzeUpload = async () => {
        if (!uploadFile) return

        setIsAnalyzingUpload(true)
        setUploadError('')
        setAnalysisResult(null)

        try {
            const formData = new FormData()
            formData.append('file', uploadFile)
            if (uploadHint.trim()) {
                formData.append('hint', uploadHint.trim())
            }

            const res = await fetch('/api/analyze-upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!res.ok) {
                const data = await res.json()
                setUploadError(data.error || 'Failed to analyze document')
                return
            }

            const result = await res.json()
            setAnalysisResult(result)

            // Auto-switch template if suggested
            if (result.suggestedTemplateId) {
                const suggestedTemplate = DOCUMENT_TEMPLATES.find(t => t.id === result.suggestedTemplateId)
                if (suggestedTemplate) {
                    setSelectedTemplateId(result.suggestedTemplateId)

                    // Initialize empty fields for the template
                    const newFields: Record<string, string> = {}
                    suggestedTemplate.fields.forEach(field => {
                        newFields[field.id] = ''
                    })
                    setTemplateFields(newFields)

                    // Pre-fill title from filename
                    if (uploadFile) {
                        const baseName = uploadFile.name.replace(/\.pdf$/i, '')
                        setTitle(baseName)
                    }

                    // Auto-fill fields from analysis
                    const extractedFields = extractTemplateFieldsFromAnalysis({
                        templateId: result.suggestedTemplateId,
                        analysisResult: result,
                        extractedText: result.extractedText || '',
                    })

                    if (Object.keys(extractedFields).length > 0) {
                        setTemplateFields(prev => ({ ...prev, ...extractedFields }))
                        setAutoFillSuccess(`Template fields auto-filled from uploaded document!`)
                        setTimeout(() => setAutoFillSuccess(''), 4000)
                    }
                }
            }

            setSuccess('Document analyzed successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            console.error('Upload analysis error:', err)
            setUploadError('Failed to analyze document. Please try again.')
        } finally {
            setIsAnalyzingUpload(false)
        }
    }

    const handleUseTemplate = (templateId: string) => {
        if (!templateId) return

        const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId)
        if (!template) return

        setSelectedTemplateId(templateId)

        // Initialize empty fields for the template
        const newFields: Record<string, string> = {}
        template.fields.forEach(field => {
            newFields[field.id] = ''
        })
        setTemplateFields(newFields)

        // Pre-fill title from filename or document type
        if (uploadFile) {
            const baseName = uploadFile.name.replace(/\.pdf$/i, '')
            setTitle(baseName)
        } else if (analysisResult) {
            setTitle(analysisResult.documentType)
        }

        // Auto-fill fields if we have analysis result
        if (analysisResult && analysisResult.extractedText) {
            const extractedFields = extractTemplateFieldsFromAnalysis({
                templateId: templateId,
                analysisResult: analysisResult,
                extractedText: analysisResult.extractedText,
            })

            if (Object.keys(extractedFields).length > 0) {
                setTemplateFields(prev => ({ ...prev, ...extractedFields }))
                setAutoFillSuccess(`Template fields auto-filled from uploaded document!`)
                setTimeout(() => setAutoFillSuccess(''), 4000)
            }
        }

        setSuccess(`Switched to ${template.name} template!`)
        setTimeout(() => setSuccess(''), 3000)

        // Scroll to new document card
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleAutoFillFields = () => {
        if (!analysisResult || !analysisResult.extractedText) {
            setError('No analyzed document available for auto-fill')
            setTimeout(() => setError(''), 3000)
            return
        }

        const targetTemplateId = analysisResult.suggestedTemplateId || selectedTemplateId
        if (targetTemplateId === 'custom_freeform') {
            setError('Auto-fill only works with structured templates, not AI Document Writer')
            setTimeout(() => setError(''), 3000)
            return
        }

        setIsAutoFilling(true)

        try {
            const template = DOCUMENT_TEMPLATES.find(t => t.id === targetTemplateId)
            if (!template) {
                throw new Error('Template not found')
            }

            // Switch to the template if needed
            if (selectedTemplateId !== targetTemplateId) {
                setSelectedTemplateId(targetTemplateId)

                // Initialize fields
                const newFields: Record<string, string> = {}
                template.fields.forEach(field => {
                    newFields[field.id] = ''
                })
                setTemplateFields(newFields)
            }

            // Pre-fill title from filename
            if (uploadFile) {
                const baseName = uploadFile.name.replace(/\.pdf$/i, '')
                setTitle(baseName)
            }

            // Extract and fill fields
            const extractedFields = extractTemplateFieldsFromAnalysis({
                templateId: targetTemplateId,
                analysisResult: analysisResult,
                extractedText: analysisResult.extractedText,
            })

            const filledCount = Object.keys(extractedFields).length
            if (filledCount > 0) {
                setTemplateFields(prev => ({ ...prev, ...extractedFields }))
                setAutoFillSuccess(`✓ ${filledCount} fields auto-filled from document!`)
                setTimeout(() => setAutoFillSuccess(''), 4000)
            } else {
                setError('Could not extract field values from this document')
                setTimeout(() => setError(''), 3000)
            }

            // Scroll to form
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            console.error('Auto-fill error:', err)
            setError('Failed to auto-fill fields')
            setTimeout(() => setError(''), 3000)
        } finally {
            setIsAutoFilling(false)
        }
    }

    const handleRebuildAsCleanDocument = async () => {
        if (!analysisResult || !analysisResult.extractedText) return

        setIsRebuilding(true)
        setRebuildError('')

        try {
            // Generate title from filename or document type
            const newTitle = uploadFile
                ? uploadFile.name.replace(/\.pdf$/i, '') + ' (Rebuilt)'
                : `${analysisResult.documentType} - Rebuilt`

            // Call the dedicated rebuild endpoint that returns plain text only
            const res = await fetch('/api/ai/rebuild-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    extractedText: analysisResult.extractedText,
                    documentType: analysisResult.documentType,
                    tone: analysisResult.tone,
                    summary: analysisResult.summary,
                    keyPoints: analysisResult.keyPoints,
                    title: newTitle,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to rebuild document')
            }

            const result = await res.json()

            // Update editor state with rebuilt content (plain text, no JSON)
            setTitle(newTitle)
            setContent(result.content)

            // Keep template as custom_freeform since this is a rebuilt document
            setSelectedTemplateId('custom_freeform')

            // Clear upload state
            setUploadFile(null)
            setUploadHint('')
            setAnalysisResult(null)

            setSuccess('Document rebuilt successfully! You can now edit and save it.')
            setTimeout(() => setSuccess(''), 4000)

            // Scroll to the editor
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err: any) {
            console.error('Rebuild error:', err)
            setRebuildError(err.message || 'Failed to rebuild document')
        } finally {
            setIsRebuilding(false)
        }
    }

    const handleCompareDocuments = async () => {
        if (!compareFileA || !compareFileB) return

        setIsComparing(true)
        setCompareError('')
        setComparisonResult(null)

        try {
            const formData = new FormData()
            formData.append('fileA', compareFileA)
            formData.append('fileB', compareFileB)
            if (compareHint.trim()) {
                formData.append('hint', compareHint.trim())
            }
            formData.append('labelA', compareFileA.name)
            formData.append('labelB', compareFileB.name)

            const res = await fetch('/api/compare-documents', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to compare documents')
            }

            const result = await res.json()
            setComparisonResult(result)
            setSuccess('Documents compared successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
            console.error('Compare error:', err)
            setCompareError(err.message || 'Failed to compare documents')
        } finally {
            setIsComparing(false)
        }
    }

    const handleClearComparison = () => {
        setCompareFileA(null)
        setCompareFileB(null)
        setCompareHint('')
        setComparisonResult(null)
        setCompareError('')
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-brand-text mb-2">Dashboard</h1>
                    <p className="text-brand-mutedText">Create AI-powered documents with templates</p>
                </div>
                <button onClick={handleLogout} className="btn-ghost flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>

            {/* Toast Messages */}
            {(success || error) && (
                <div className={`p-4 rounded-card border animate-slide-up ${success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    } text-sm flex items-center gap-3 shadow-card`}>
                    {success ? (
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="font-medium">{success || error}</span>
                </div>
            )}

            {/* Usage Stats Banner */}
            {usageStats && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-card border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Free Tier</span>
                            <span className="text-[10px] px-2 py-0.5 bg-brand-accent/10 text-brand-accent rounded-full">Today's Usage</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Uploads:</span>
                                <span className={`font-semibold ${usageStats.uploads.remaining <= 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {usageStats.uploads.used}/{usageStats.uploads.limit}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Rebuilds:</span>
                                <span className={`font-semibold ${usageStats.rebuilds.remaining <= 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {usageStats.rebuilds.used}/{usageStats.rebuilds.limit}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Compares:</span>
                                <span className={`font-semibold ${usageStats.compares.remaining <= 1 ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {usageStats.compares.used}/{usageStats.compares.limit}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Documents:</span>
                                <span className={`font-semibold ${usageStats.documents.remaining <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                                    {usageStats.documents.used}/{usageStats.documents.limit}
                                </span>
                            </div>
                        </div>
                        {(usageStats.uploads.remaining <= 2 || usageStats.rebuilds.remaining <= 2 || usageStats.compares.remaining <= 2) && (
                            <button className="text-xs font-medium px-3 py-1.5 bg-brand-accent text-white rounded-full hover:bg-brand-accent/90 transition-colors">
                                Upgrade to Pro
                            </button>
                        )}
                    </div>
                </div>
            )}


            <div className="card border-l-4 border-l-brand-accent">
                <h2 className="card-title mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Upload & Analyze Document
                    <span className="relative group cursor-help">
                        <svg className="w-4 h-4 text-gray-400 hover:text-brand-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 text-center z-10">
                            Upload any PDF document and AI will extract key data, suggest a template, and auto-fill fields for you.
                        </div>
                    </span>
                </h2>
                <p className="text-sm text-brand-mutedText mb-4">
                    Upload contracts, letters, reports, or invoices — AI will extract key information and suggest the best template
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                Upload PDF Document
                            </label>
                            <div className="flex items-center gap-3">
                                <label className="flex-1 cursor-pointer">
                                    <div className="w-full px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-accent/50 hover:bg-brand-accent/5 transition-all flex items-center justify-center gap-2 text-sm text-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        {uploadFile ? uploadFile.name : "Choose PDF file..."}
                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                Optional Hint
                            </label>
                            <input
                                type="text"
                                value={uploadHint}
                                onChange={(e) => setUploadHint(e.target.value)}
                                placeholder="e.g., This is a rental agreement for my apartment"
                                className="input text-sm"
                            />
                        </div>

                        <button
                            onClick={handleAnalyzeUpload}
                            disabled={!uploadFile || isAnalyzingUpload}
                            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzingUpload ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner"></span>
                                    Analyzing...
                                </span>
                            ) : "Analyze Document"}
                        </button>

                        {uploadError && (
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                {uploadError}
                            </p>
                        )}
                    </div>

                    <div className="bg-brand-pillBg rounded-card p-4 border border-brand-border/50 min-h-[200px]">
                        {!analysisResult ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-8">
                                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                <p>Upload a document to see AI analysis here</p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200">
                                        Type: {analysisResult.documentType}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                                        Tone: {analysisResult.tone}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-1">Summary</h4>
                                    <p className="text-gray-600 leading-relaxed text-xs">
                                        {analysisResult.summary}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-1">Key Points</h4>
                                    <ul className="list-disc list-inside text-gray-600 text-xs space-y-1">
                                        {analysisResult.keyPoints.slice(0, 3).map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                </div>

                                {analysisResult.suggestedTemplateId && (
                                    <div className="pt-3 border-t border-gray-200 mt-2">
                                        <div className="flex items-center justify-between gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                            <div>
                                                <p className="text-xs text-yellow-800 font-medium">Suggested Template</p>
                                                <p className="text-xs text-yellow-600">
                                                    {DOCUMENT_TEMPLATES.find(t => t.id === analysisResult.suggestedTemplateId)?.name}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleUseTemplate(analysisResult.suggestedTemplateId!)}
                                                className="px-3 py-1.5 bg-white border border-yellow-200 text-yellow-700 rounded-md text-xs font-medium hover:bg-yellow-50 transition shadow-sm"
                                            >
                                                Use Template
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Auto-Fill Template Fields */}
                                {analysisResult.suggestedTemplateId && (
                                    <div className="pt-3 border-t border-gray-200 mt-2">
                                        <div className="bg-brand-accent/10 p-3 rounded-lg border border-brand-accent/20">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-xs text-brand-text font-medium flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                                                        </svg>
                                                        Auto-Fill Template Fields
                                                    </p>
                                                    <p className="text-[10px] text-brand-mutedText mt-0.5">
                                                        Extract values from PDF to fill template
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleAutoFillFields}
                                                    disabled={isAutoFilling}
                                                    className="px-3 py-1.5 bg-brand-accent text-brand-text rounded-lg text-xs font-medium hover:bg-brand-accentDark transition shadow-sm disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {isAutoFilling ? (
                                                        <>
                                                            <span className="spinner"></span>
                                                            Filling...
                                                        </>
                                                    ) : (
                                                        'Auto-Fill'
                                                    )}
                                                </button>
                                            </div>
                                            {autoFillSuccess && (
                                                <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100 flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {autoFillSuccess}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Rebuild as Clean Document Button */}
                                <div className="pt-3 border-t border-gray-200 mt-2">
                                    <button
                                        onClick={handleRebuildAsCleanDocument}
                                        disabled={isRebuilding || !analysisResult.extractedText}
                                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isRebuilding ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                Rebuilding...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Rebuild as Clean AI Document
                                            </>
                                        )}
                                    </button>
                                    {rebuildError && (
                                        <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                                            {rebuildError}
                                        </p>
                                    )}
                                    <p className="mt-2 text-[10px] text-gray-400 text-center">
                                        AI will create a polished version in the editor below
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Compare Documents Card */}
            <div className="card mb-6 border-l-4 border-l-amber-500">
                <h2 className="card-title mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Compare Document Versions
                    <span className="relative group cursor-help">
                        <svg className="w-4 h-4 text-gray-400 hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-72 text-center z-10">
                            Perfect for comparing contract revisions. AI will highlight added, removed, and modified clauses, dates, and amounts.
                        </div>
                    </span>
                </h2>
                <p className="text-sm text-brand-mutedText mb-4">
                    Upload two versions of a document (e.g. contract v1 vs v2) to see exactly what changed
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Document A Input */}
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2">
                            Document A (Original/Old Version)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                    setCompareFileA(e.target.files?.[0] || null)
                                    setComparisonResult(null)
                                    setCompareError('')
                                }}
                                className="hidden"
                                id="compareFileA"
                            />
                            <label
                                htmlFor="compareFileA"
                                className={`flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${compareFileA
                                    ? 'border-amber-400 bg-amber-50'
                                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30'
                                    }`}
                            >
                                <svg className={`w-6 h-6 ${compareFileA ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className={`text-sm ${compareFileA ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                                    {compareFileA ? compareFileA.name : 'Click to select PDF...'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Document B Input */}
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2">
                            Document B (New/Updated Version)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                    setCompareFileB(e.target.files?.[0] || null)
                                    setComparisonResult(null)
                                    setCompareError('')
                                }}
                                className="hidden"
                                id="compareFileB"
                            />
                            <label
                                htmlFor="compareFileB"
                                className={`flex items-center gap-3 w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${compareFileB
                                    ? 'border-amber-400 bg-amber-50'
                                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/30'
                                    }`}
                            >
                                <svg className={`w-6 h-6 ${compareFileB ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className={`text-sm ${compareFileB ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                                    {compareFileB ? compareFileB.name : 'Click to select PDF...'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Optional Hint */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-brand-text mb-2">
                        Optional: Describe what you're comparing
                    </label>
                    <input
                        type="text"
                        value={compareHint}
                        onChange={(e) => setCompareHint(e.target.value)}
                        placeholder="e.g. Employment contract v1 vs v2, Offer letter revisions..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                </div>

                {/* Compare Button */}
                <div className="mt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={handleCompareDocuments}
                        disabled={!compareFileA || !compareFileB || isComparing}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isComparing ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Comparing...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Compare Documents
                            </>
                        )}
                    </button>
                    {(compareFileA || compareFileB || comparisonResult) && (
                        <button
                            type="button"
                            onClick={handleClearComparison}
                            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Error Display */}
                {compareError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {compareError}
                    </div>
                )}

                {/* Comparison Results */}
                {comparisonResult && (
                    <div className="mt-6 space-y-4 border-t pt-6">
                        {/* Header with Labels */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                {comparisonResult.labelA}
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {comparisonResult.labelB}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Overall Summary
                            </h3>
                            <p className="text-amber-700 text-sm leading-relaxed">{comparisonResult.comparison.summary}</p>
                        </div>

                        {/* Clause Changes */}
                        {(comparisonResult.comparison.clauseChanges.added.length > 0 ||
                            comparisonResult.comparison.clauseChanges.removed.length > 0 ||
                            comparisonResult.comparison.clauseChanges.modified.length > 0) && (
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Clause & Section Changes
                                    </h3>

                                    {/* Added */}
                                    {comparisonResult.comparison.clauseChanges.added.length > 0 && (
                                        <div className="mb-3">
                                            <h4 className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2">Added in New Version</h4>
                                            <div className="space-y-2">
                                                {comparisonResult.comparison.clauseChanges.added.map((item, i) => (
                                                    <div key={i} className="pl-3 border-l-2 border-green-400 bg-green-50 p-2 rounded-r-lg">
                                                        <p className="font-medium text-green-800 text-sm">{item.title}</p>
                                                        <p className="text-green-700 text-xs mt-1">{item.description}</p>
                                                        {item.afterSnippet && (
                                                            <p className="text-green-600 text-xs mt-1 italic">"{item.afterSnippet}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Removed */}
                                    {comparisonResult.comparison.clauseChanges.removed.length > 0 && (
                                        <div className="mb-3">
                                            <h4 className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Removed from Original</h4>
                                            <div className="space-y-2">
                                                {comparisonResult.comparison.clauseChanges.removed.map((item, i) => (
                                                    <div key={i} className="pl-3 border-l-2 border-red-400 bg-red-50 p-2 rounded-r-lg">
                                                        <p className="font-medium text-red-800 text-sm">{item.title}</p>
                                                        <p className="text-red-700 text-xs mt-1">{item.description}</p>
                                                        {item.beforeSnippet && (
                                                            <p className="text-red-600 text-xs mt-1 italic line-through">"{item.beforeSnippet}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Modified */}
                                    {comparisonResult.comparison.clauseChanges.modified.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Modified Clauses</h4>
                                            <div className="space-y-2">
                                                {comparisonResult.comparison.clauseChanges.modified.map((item, i) => (
                                                    <div key={i} className="pl-3 border-l-2 border-blue-400 bg-blue-50 p-2 rounded-r-lg">
                                                        <p className="font-medium text-blue-800 text-sm">{item.title}</p>
                                                        <p className="text-blue-700 text-xs mt-1">{item.description}</p>
                                                        {item.beforeSnippet && (
                                                            <p className="text-red-600 text-xs mt-1"><span className="font-medium">Before:</span> "{item.beforeSnippet}"</p>
                                                        )}
                                                        {item.afterSnippet && (
                                                            <p className="text-green-600 text-xs mt-0.5"><span className="font-medium">After:</span> "{item.afterSnippet}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* Date Changes */}
                        {comparisonResult.comparison.dateChanges.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Date & Deadline Changes
                                </h3>
                                <div className="space-y-2">
                                    {comparisonResult.comparison.dateChanges.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 bg-indigo-50 rounded-lg text-sm">
                                            <span className="font-medium text-indigo-800">{item.field}:</span>
                                            <span className="text-red-600 line-through">{item.oldValue}</span>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                            <span className="text-green-600 font-medium">{item.newValue}</span>
                                            <span className="text-indigo-600 text-xs">({item.description})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amount Changes */}
                        {comparisonResult.comparison.amountChanges.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Money & Amount Changes
                                </h3>
                                <div className="space-y-2">
                                    {comparisonResult.comparison.amountChanges.map((item, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${item.significance === 'major' ? 'bg-red-50 border border-red-200' :
                                            item.significance === 'moderate' ? 'bg-yellow-50 border border-yellow-200' :
                                                'bg-emerald-50'
                                            }`}>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.significance === 'major' ? 'bg-red-200 text-red-700' :
                                                item.significance === 'moderate' ? 'bg-yellow-200 text-yellow-700' :
                                                    'bg-emerald-200 text-emerald-700'
                                                }`}>{item.significance}</span>
                                            <span className="font-medium text-gray-800">{item.field}:</span>
                                            <span className="text-red-600 line-through">{item.oldValue}</span>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                            <span className="text-green-600 font-medium">{item.newValue}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Responsibility Changes */}
                        {comparisonResult.comparison.responsibilityChanges.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Responsibility & Obligation Changes
                                </h3>
                                <div className="space-y-2">
                                    {comparisonResult.comparison.responsibilityChanges.map((item, i) => (
                                        <div key={i} className={`p-2 rounded-lg text-sm ${item.change === 'added' ? 'bg-green-50 border-l-2 border-green-400' :
                                            item.change === 'removed' ? 'bg-red-50 border-l-2 border-red-400' :
                                                'bg-blue-50 border-l-2 border-blue-400'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.change === 'added' ? 'bg-green-200 text-green-700' :
                                                    item.change === 'removed' ? 'bg-red-200 text-red-700' :
                                                        'bg-blue-200 text-blue-700'
                                                    }`}>{item.change}</span>
                                                <span className="font-medium text-gray-800">{item.party}</span>
                                            </div>
                                            <p className="text-gray-600 mt-1">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tone Comparison */}
                        {comparisonResult.comparison.toneComparison && (
                            <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                                <h3 className="font-semibold text-violet-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    Tone & Strictness
                                </h3>
                                <p className="text-violet-700 text-sm">{comparisonResult.comparison.toneComparison}</p>
                            </div>
                        )}

                        {/* Risks */}
                        {comparisonResult.comparison.risks.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Potential Risks & Red Flags
                                </h3>
                                <ul className="space-y-1">
                                    {comparisonResult.comparison.risks.map((risk, i) => (
                                        <li key={i} className="flex items-start gap-2 text-red-700 text-sm">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {comparisonResult.comparison.recommendations.length > 0 && (
                            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                <h3 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Recommendations
                                </h3>
                                <ul className="space-y-1">
                                    {comparisonResult.comparison.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2 text-teal-700 text-sm">
                                            <span className="text-teal-500 mt-0.5">✓</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="card">
                    <h2 className="card-title mb-6">New Document</h2>

                    <form onSubmit={handleSaveDocument} className="space-y-5">
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                Choose Template
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                                className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-brand-accent/40 transition-all focus:outline-none focus:border-brand-accent"
                            >
                                <div className="flex items-center gap-3">
                                    {selectedTemplate?.id === 'custom_freeform' ? (
                                        <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-brand-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-brand-text text-sm">{selectedTemplate?.name}</div>
                                        <div className="text-xs text-brand-mutedText truncate">{selectedTemplate?.description}</div>
                                    </div>
                                </div>
                                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isTemplateDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                                    <div className="p-2">
                                        <button
                                            type="button"
                                            onClick={() => handleTemplateSelect('custom_freeform')}
                                            className={`w-full px-3 py-2.5 rounded-lg text-left transition-all flex items-start gap-3 ${selectedTemplateId === 'custom_freeform'
                                                ? 'bg-brand-accent/10 border border-brand-accent'
                                                : 'hover:bg-brand-accent/5 border border-dashed border-transparent hover:border-brand-accent/30'
                                                }`}
                                        >
                                            <svg className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-brand-text">AI Document Writer</div>
                                                <div className="text-xs text-brand-mutedText mt-0.5">Create any document with AI assistance</div>
                                            </div>
                                            {selectedTemplateId === 'custom_freeform' && (
                                                <svg className="w-5 h-5 text-brand-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>

                                        <div className="my-2 border-t border-gray-200"></div>

                                        <div className="space-y-1">
                                            {DOCUMENT_TEMPLATES.filter(t => t.id !== 'custom_freeform').map(template => (
                                                <button
                                                    key={template.id}
                                                    type="button"
                                                    onClick={() => handleTemplateSelect(template.id)}
                                                    className={`w-full px-3 py-2.5 rounded-lg text-left transition-all flex items-start gap-3 ${selectedTemplateId === template.id
                                                        ? 'bg-gradient-to-r from-brand-accent/10 to-yellow-300/10 border border-brand-accent'
                                                        : 'hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <svg className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm text-brand-text">{template.name}</div>
                                                        <div className="text-xs text-brand-mutedText mt-0.5">{template.description}</div>
                                                    </div>
                                                    {selectedTemplateId === template.id && (
                                                        <svg className="w-5 h-5 text-brand-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                <span className="badge bg-brand-accent/10 text-brand-text mr-2">Required</span>
                                Document Title
                            </label>
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Certificate of Completion"
                                className="textarea text-base"
                                rows={3}
                                required
                            />
                        </div>

                        {selectedTemplate && selectedTemplate.fields.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-brand-text">
                                    Document Details
                                </label>
                                {selectedTemplate.fields.map(field => (
                                    <div key={field.id}>
                                        <label className="block text-xs font-medium text-brand-mutedText mb-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={templateFields[field.id] || ''}
                                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="input text-sm"
                                            required={field.required}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                {isCustomFreeform
                                    ? "Describe what you want to generate (AI will detect the document type)"
                                    : "Additional Instructions (Optional)"}
                            </label>
                            <textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder={isCustomFreeform
                                    ? "Example: 'Write a formal complaint email to my landlord about water leakage' or 'Create a short project status report for the website redesign.'"
                                    : "e.g., Use formal tone, include company letterhead format..."}
                                className="textarea"
                                rows={isCustomFreeform ? 3 : 2}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text mb-2">
                                Generated Content
                            </label>
                            <div className="relative">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Click 'Generate with AI' to create content, or write your own..."
                                    className="textarea"
                                    rows={8}
                                />
                                {content && (
                                    <button
                                        type="button"
                                        onClick={() => setContent('')}
                                        className="absolute top-2 right-2 text-xs text-red-600 hover:text-red-700 bg-white rounded px-2 py-1 shadow-sm border border-gray-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-brand-mutedText mt-1">
                                {isCustomFreeform
                                    ? "AI will automatically detect and format the right document type"
                                    : "AI will consider any existing content when generating"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="text-[11px] text-gray-500 mr-2">
                                    AI rewrite tools:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("improve")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "improve" ? "Improving..." : "Improve"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("formal")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "formal" ? "Rewriting..." : "More formal"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("concise")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "concise" ? "Rewriting..." : "Concise"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("friendly")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "friendly" ? "Rewriting..." : "Friendly"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("expand")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "expand" ? "Expanding..." : "Expand"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRewrite("summarize")}
                                    disabled={!content.trim() || !!isRewriting}
                                    className="rounded-full px-3 py-1 border border-gray-200 text-gray-700 text-xs hover:bg-gray-100 disabled:opacity-50 transition"
                                >
                                    {isRewriting === "summarize" ? "Summarizing..." : "Summarize"}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleGenerateWithAI}
                                disabled={isGenerating || !title.trim()}
                                className="btn-secondary flex-1"
                            >
                                {isGenerating ? 'Generating...' : 'Generate with AI'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim() || !content.trim()}
                                className="btn-primary flex-1"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Document'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card">
                    <h2 className="card-title mb-6">Your Documents</h2>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="spinner-lg mb-4"></div>
                            <p className="text-brand-mutedText">Loading your documents...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-20 h-20 rounded-card bg-brand-accent/10 flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-brand-text font-semibold text-lg mb-1">No documents yet</p>
                            <p className="text-sm text-brand-mutedText mb-4">Create your first AI-powered document above</p>
                            <div className="text-xs text-gray-400 space-y-1 text-center">
                                <p className="font-medium text-gray-500">Try creating:</p>
                                <p>📝 Job offer letter for a new hire</p>
                                <p>📋 Service agreement for a client</p>
                                <p>🎓 Certificate of completion</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {documents.map((doc, index) => (
                                <div key={doc.id} className="doc-row animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-brand-text">{doc.title}</h3>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${doc.isPublic
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {doc.isPublic ? "Public" : "Private"}
                                                </span>
                                                {doc.signature && (
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Signed
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-brand-mutedText">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                                {doc.signature && (
                                                    <span className="ml-2 text-violet-600">
                                                        • Signed by {doc.signature.signedByName} on {new Date(doc.signature.signedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => openSignModal(doc.doc_id)}
                                            className={`text-xs font-medium rounded-full px-3 py-1.5 transition inline-flex items-center gap-1 ${doc.signature
                                                ? 'border border-violet-200 text-violet-700 hover:bg-violet-50'
                                                : 'bg-violet-600 text-white hover:bg-violet-700'
                                                }`}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            {doc.signature ? 'Update Signature' : 'Sign'}
                                        </button>
                                        <a
                                            href={`/api/documents/${doc.doc_id}/pdf`}
                                            className="text-xs font-medium rounded-full px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 transition inline-flex items-center gap-1"
                                            target="_blank"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePublic(doc.doc_id, !doc.isPublic)}
                                            className="text-xs font-medium rounded-full px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                                        >
                                            {doc.isPublic ? "Make Private" : "Make Public"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLink(doc.doc_id)}
                                            disabled={!doc.isPublic}
                                            className="text-xs font-medium rounded-full px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition inline-flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy Link
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.doc_id)}
                                            className="text-xs font-medium rounded-full px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 transition inline-flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                    <div className="text-xs pt-2 border-t border-gray-100 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-brand-mutedText">Doc ID:</span>
                                            <button
                                                onClick={() => copyToClipboard(doc.doc_id)}
                                                className="font-mono text-brand-text hover:text-brand-accent transition-colors"
                                            >
                                                {doc.doc_id.substring(0, 8)}...
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Signature Settings Card */}
            <div className="card border-l-4 border-l-brand-accent">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowSignatureSettings(!showSignatureSettings)}
                >
                    <h2 className="card-title flex items-center gap-2">
                        <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Signature Settings
                    </h2>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${showSignatureSettings ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {showSignatureSettings && (
                    <div className="mt-6 space-y-6">
                        {/* Existing Signatures */}
                        <div>
                            <h3 className="text-sm font-medium text-brand-text mb-3">Your Signatures</h3>
                            {isLoadingSignatures ? (
                                <div className="text-center py-4">
                                    <div className="spinner"></div>
                                </div>
                            ) : signatures.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">No signatures yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Create one below to start signing documents</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {signatures.map((sig) => (
                                        <div
                                            key={sig.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border ${sig.is_default
                                                ? 'bg-brand-accent/10 border-brand-accent/30'
                                                : 'bg-white border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {sig.imageUrl ? (
                                                    <img
                                                        src={sig.imageUrl}
                                                        alt="Signature"
                                                        className="w-16 h-10 object-contain bg-white rounded border"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-10 flex items-center justify-center bg-gray-100 rounded border">
                                                        <span className="text-sm italic text-gray-600">{sig.display_name.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-brand-text">{sig.display_name}</p>
                                                    {sig.role_title && (
                                                        <p className="text-xs text-gray-500">{sig.role_title}</p>
                                                    )}
                                                    <p className="text-[10px] text-gray-400">
                                                        {sig.signature_type} • {new Date(sig.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {sig.is_default ? (
                                                    <span className="text-[10px] px-2 py-0.5 bg-brand-accent/20 text-brand-text rounded-full font-medium">Default</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSetDefaultSignature(sig.id)}
                                                        className="text-[10px] px-2 py-0.5 border border-gray-300 text-gray-600 rounded-full hover:bg-gray-100"
                                                    >
                                                        Set Default
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteSignature(sig.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Create New Signature */}
                        <div className="border-t pt-6">
                            <h3 className="text-sm font-medium text-brand-text mb-3">Create New Signature</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setNewSignatureForm(prev => ({ ...prev, type: 'typed', imageData: '' }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition ${newSignatureForm.type === 'typed'
                                            ? 'border-brand-accent bg-brand-accent/10 text-brand-text'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Type Name
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewSignatureForm(prev => ({ ...prev, type: 'uploaded' }))}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition ${newSignatureForm.type === 'uploaded'
                                            ? 'border-brand-accent bg-brand-accent/10 text-brand-text'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Upload Image
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-text mb-1">Display Name *</label>
                                    <input
                                        type="text"
                                        value={newSignatureForm.displayName}
                                        onChange={(e) => setNewSignatureForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        placeholder="Full legal name"
                                        className="input text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-text mb-1">Role / Title (optional)</label>
                                    <input
                                        type="text"
                                        value={newSignatureForm.roleTitle}
                                        onChange={(e) => setNewSignatureForm(prev => ({ ...prev, roleTitle: e.target.value }))}
                                        placeholder="e.g. CEO, HR Manager, Founder"
                                        className="input text-sm"
                                    />
                                </div>

                                {newSignatureForm.type === 'typed' && newSignatureForm.displayName && (
                                    <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <p className="text-xs text-gray-500 mb-2">Preview:</p>
                                        <p className="text-2xl italic text-gray-800 font-serif">{newSignatureForm.displayName}</p>
                                    </div>
                                )}

                                {newSignatureForm.type === 'uploaded' && (
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text mb-1">Upload Signature Image</label>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg"
                                            onChange={handleImageUpload}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">PNG or JPEG, max 500KB</p>
                                        {newSignatureForm.imageData && (
                                            <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                                                <img
                                                    src={newSignatureForm.imageData}
                                                    alt="Uploaded signature"
                                                    className="max-h-20 mx-auto"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCreateSignature}
                                    disabled={isCreatingSignature || !newSignatureForm.displayName.trim()}
                                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreatingSignature ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="spinner"></span>
                                            Creating...
                                        </span>
                                    ) : (
                                        'Create Signature'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sign Document Modal */}
            {showSignModal && signDocId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-brand-text">Sign Document</h3>
                                <button
                                    onClick={() => { setShowSignModal(false); setSignDocId(null); }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
                                <p className="text-sm text-violet-700">
                                    <strong>Document:</strong> {documents.find(d => d.doc_id === signDocId)?.title}
                                </p>
                                {documents.find(d => d.doc_id === signDocId)?.signature && (
                                    <p className="text-xs text-violet-600 mt-1">
                                        Currently signed by {documents.find(d => d.doc_id === signDocId)?.signature?.signedByName}
                                    </p>
                                )}
                            </div>

                            {signatures.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-gray-500 mb-3">You don't have any signatures yet.</p>
                                    <button
                                        onClick={() => { setShowSignModal(false); setShowSignatureSettings(true); }}
                                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                                    >
                                        Create a signature first →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-brand-text mb-2">Select Signature</label>
                                        <div className="space-y-2">
                                            {signatures.map((sig) => (
                                                <button
                                                    key={sig.id}
                                                    type="button"
                                                    onClick={() => setSignatureFormData(prev => ({
                                                        ...prev,
                                                        selectedSignatureId: sig.id,
                                                        displayName: sig.display_name,
                                                        roleTitle: sig.role_title || '',
                                                    }))}
                                                    className={`w-full p-3 rounded-lg border text-left transition ${signatureFormData.selectedSignatureId === sig.id
                                                        ? 'border-violet-500 bg-violet-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {sig.imageUrl ? (
                                                            <img src={sig.imageUrl} alt="" className="w-12 h-8 object-contain bg-white rounded border" />
                                                        ) : (
                                                            <div className="w-12 h-8 flex items-center justify-center bg-gray-100 rounded border">
                                                                <span className="text-xs italic">{sig.display_name.charAt(0)}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium">{sig.display_name}</p>
                                                            {sig.role_title && <p className="text-xs text-gray-500">{sig.role_title}</p>}
                                                        </div>
                                                        {sig.is_default && (
                                                            <span className="ml-auto text-[10px] px-2 py-0.5 bg-violet-200 text-violet-700 rounded-full">Default</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-brand-text mb-1">Display Name on Document</label>
                                        <input
                                            type="text"
                                            value={signatureFormData.displayName}
                                            onChange={(e) => setSignatureFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-brand-text mb-1">Role / Title (optional)</label>
                                        <input
                                            type="text"
                                            value={signatureFormData.roleTitle}
                                            onChange={(e) => setSignatureFormData(prev => ({ ...prev, roleTitle: e.target.value }))}
                                            placeholder="e.g. CEO, Manager"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>

                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            This will embed your signature in the generated PDF. Once signed, the document will show your signature when downloaded or viewed publicly.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSignDocument}
                                        disabled={isSigning || !signatureFormData.selectedSignatureId || !signatureFormData.displayName}
                                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSigning ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="spinner"></span>
                                                Signing...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Sign Document
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-card shadow-cardHover p-6 max-w-md w-full mx-4 animate-slide-up">
                        <h3 className="text-lg font-semibold text-brand-text mb-2">{confirmModal.title}</h3>
                        <p className="text-brand-mutedText text-sm mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    confirmModal.onConfirm()
                                    setConfirmModal(prev => ({ ...prev, show: false }))
                                }}
                                className={confirmModal.confirmStyle === 'danger'
                                    ? 'px-6 py-3 bg-red-500 text-white font-semibold rounded-button transition-all duration-200 hover:bg-red-600'
                                    : 'btn-primary'
                                }
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
