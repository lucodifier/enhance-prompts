import { getCurrentUser } from "@/lib/auth"
import { upsertUserSettings, getUserSettings, ensureUserExists, type UserSettingsRow } from "@/lib/data"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      ai_provider,
      groq_api_key,
      ollama_endpoint,
      ai_model,
      commit_provider,
      commit_model,
      pr_provider,
      pr_model,
      pr_template,
      use_caveman,
    } = (await request.json()) as UserSettingsRow

    await ensureUserExists(user)

    await upsertUserSettings(user.id, {
      ai_provider,
      groq_api_key,
      ollama_endpoint,
      ai_model,
      commit_provider,
      commit_model,
      pr_provider,
      pr_model,
      pr_template,
      use_caveman,
    })

    return NextResponse.json({ success: true })
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

    const settings = await getUserSettings(user.id)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[app] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
