import { getCurrentUser } from "@/lib/auth"
import { insertPrompt, getUserPrompts } from "@/lib/data"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { originalPrompt, enhancedPrompt } = await request.json()

    const data = await insertPrompt(user.id, originalPrompt, enhancedPrompt)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[app] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prompts = await getUserPrompts(user.id)

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error("[app] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
