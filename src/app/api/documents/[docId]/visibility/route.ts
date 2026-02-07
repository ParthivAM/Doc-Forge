// FILE: src/app/api/documents/[docId]/visibility/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { verifyJwt } from "@/lib/auth"

const schema = z.object({
    isPublic: z.boolean(),
})

export async function PATCH(
    request: Request,
    { params }: { params: { docId: string } }
) {
    try {
        const token = cookies().get("token")?.value

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const payload = verifyJwt(token)
        if (!payload || typeof payload === 'string') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = payload.userId

        const body = await request.json()
        const { isPublic } = schema.parse(body)

        const { data: doc, error } = await supabaseAdmin
            .from("documents")
            .select("id, owner_id, metadata")
            .eq("doc_id", params.docId)
            .single()

        if (error || !doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 })
        }

        if (doc.owner_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const meta = (doc.metadata as any) ?? {}
        const updatedMetadata = { ...meta, isPublic }

        const { error: updateError } = await supabaseAdmin
            .from("documents")
            .update({ metadata: updatedMetadata })
            .eq("id", doc.id)

        if (updateError) {
            return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
        }

        return NextResponse.json({ success: true, isPublic })
    } catch (error: any) {
        console.error("PATCH visibility error:", error)
        return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 })
    }
}
