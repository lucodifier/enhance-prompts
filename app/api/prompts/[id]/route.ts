import { getCurrentUser } from "@/lib/auth"
import { deleteUserPrompt } from "@/lib/data"
import { NextResponse } from "next/server"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deleted = await deleteUserPrompt(user.id, id)

    if (!deleted) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[app] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
