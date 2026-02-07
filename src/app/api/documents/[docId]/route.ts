// FILE: src/app/api/documents/[docId]/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { verifyJwt } from "@/lib/auth"

export async function DELETE(
    request: Request,
    { params }: { params: { docId: string } }
) {
    try {
        const cookieStore = cookies()
        const token = cookieStore.get("token")?.value

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = payload.userId

        const { data: doc, error } = await supabaseAdmin
            .from("documents")
            .select("id, owner_id")
            .eq("doc_id", params.docId)
            .single()

        if (error || !doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        if (doc.owner_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { error: deleteError } = await supabaseAdmin
            .from("documents")
            .delete()
            .eq("id", doc.id)

        if (deleteError) {
            return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete document error:", error)
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
    }
}
