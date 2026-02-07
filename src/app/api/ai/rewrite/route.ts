// FILE: src/app/api/ai/rewrite/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { verifyJwt } from "@/lib/auth"
import { rewriteDocumentText, RewriteMode } from "@/lib/ai"

const schema = z.object({
    content: z.string().min(1),
    mode: z.enum([
        "improve",
        "formal",
        "concise",
        "friendly",
        "expand",
        "summarize",
    ]),
    title: z.string().optional(),
    templateId: z.string().optional(),
})

export async function POST(request: Request) {
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

        const body = await request.json()
        const parsed = schema.parse(body)

        const result = await rewriteDocumentText({
            content: parsed.content,
            mode: parsed.mode as RewriteMode,
            title: parsed.title,
            templateId: parsed.templateId,
        })

        return NextResponse.json({ content: result.content })
    } catch (err) {
        console.error("Rewrite error:", err)
        return NextResponse.json(
            { error: "Failed to rewrite document" },
            { status: 500 }
        )
    }
}
