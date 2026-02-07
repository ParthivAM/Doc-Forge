// FILE: src/app/api/public/documents/[docId]/route.ts
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(
    request: Request,
    { params }: { params: { docId: string } }
) {
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
        const isPublic = metadata.isPublic === true
        const content: string = metadata.content ?? ""

        if (!isPublic) {
            return NextResponse.json({ error: "Document is not public" }, { status: 403 })
        }

        return NextResponse.json({
            doc_id: data.doc_id,
            title: data.title,
            created_at: data.created_at,
            content,
        })
    } catch (error: any) {
        console.error("GET public document error:", error)
        return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
    }
}
