// FILE: src/app/d/[docId]/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { notFound } from "next/navigation"

interface PublicDocumentPageProps {
    params: {
        docId: string
    }
}

export default async function PublicDocumentPage({ params }: PublicDocumentPageProps) {
    const { data, error } = await supabaseAdmin
        .from("documents")
        .select("doc_id, title, created_at, metadata")
        .eq("doc_id", params.docId)
        .single()

    if (error || !data) {
        return (
            <div className="app-shell">
                <div className="max-w-4xl mx-auto py-16">
                    <div className="card text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-brand-text mb-2">Document Not Found</h1>
                        <p className="text-brand-mutedText">
                            This document is not available or is private.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const metadata = (data.metadata as any) ?? {}
    const isPublic = metadata.isPublic === true
    const content: string = metadata.content ?? ""

    if (!isPublic) {
        return (
            <div className="app-shell">
                <div className="max-w-4xl mx-auto py-16">
                    <div className="card text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h1 className="text-2xl font-bold text-brand-text mb-2">Private Document</h1>
                        <p className="text-brand-mutedText">
                            This document is not available or is private.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const createdDate = new Date(data.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    return (
        <div className="app-shell">
            <div className="max-w-4xl mx-auto py-8 space-y-6">
                <div className="card">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-brand-text mb-2">{data.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-brand-mutedText">
                                <span>Created: {createdDate}</span>
                                <span>•</span>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Public document
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6 mt-6">
                        <h2 className="text-sm font-semibold text-brand-text mb-3">Content</h2>
                        <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm text-brand-text leading-relaxed bg-gray-50 p-4 rounded-lg">
                                {content}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-sm font-semibold text-brand-text mb-4">PDF Preview</h2>
                    <iframe
                        src={`/api/public/documents/${data.doc_id}/pdf`}
                        className="w-full h-[500px] rounded-xl border border-gray-200 bg-white"
                        title="PDF Preview"
                    />
                </div>

                <div className="text-center text-xs text-brand-mutedText">
                    <p>Powered by DocVerify</p>
                </div>
            </div>
        </div>
    )
}
