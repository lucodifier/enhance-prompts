import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"
import { NextResponse } from "next/server"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { resolveOllamaEndpoint, ollamaChat } from "@/lib/ollama"
import { looksLikeOllamaModelNotFound, resolveGroqModel, resolveOllamaModel } from "@/lib/ai-models"

type CommitRequest = {
  diff?: string
  message?: string
  scopeHint?: string
  style?: "conventional" | "subject-only"
}

const COMMIT_SYSTEM_PROMPT = `You write high-quality git commit messages from diffs.

Rules:
- Output must be plain text.
- Prefer Conventional Commits: <type>(<scope>): <subject>
- Allowed types: feat, fix, refactor, perf, test, docs, chore, build, ci, style.
- Scope: short, lowercase, derived from changed area (e.g. users, auth, api, ui). If unsure, omit scope.
- Subject:
  - imperative mood ("add", "fix", "refactor")
  - <= 72 chars
  - no period at end
- NEVER include body, explanations, or additional text
- NEVER include filenames unless essential
- NEVER include "Diff (trecho)" or similar labels
- If input looks like unrelated noise, ask for a git diff.
- Output ONLY the commit message line, nothing else.
`


async function generateWithOllama(params: {
  endpoint: string
  model: string
  diffOrMessage: string
  scopeHint?: string
  style?: "conventional" | "subject-only"
}) {
  const userContent =
    params.diffOrMessage.startsWith("diff --git") || params.diffOrMessage.includes("@@")
      ? `Git diff (may be truncated):\n\n${params.diffOrMessage}`
      : `Change description:\n\n${params.diffOrMessage}`

  const hint = params.scopeHint?.trim() ? `\n\nScope hint: ${params.scopeHint.trim()}` : ""
  const style = params.style === "subject-only" ? "\n\nOutput: subject line only." : ""

  const text = await ollamaChat({
    endpoint: params.endpoint,
    model: params.model,
    maxTokens: params.style === "subject-only" ? 120 : 300,
    temperature: 0.1,
    messages: [
      { role: "system", content: COMMIT_SYSTEM_PROMPT },
      { role: "user", content: `${userContent}${hint}${style}` },
    ],
  })

  return text.trim()
}

async function generateWithGroq(params: {
  apiKey: string
  model: string
  diffOrMessage: string
  scopeHint?: string
  style?: "conventional" | "subject-only"
}) {
  const userContent =
    params.diffOrMessage.startsWith("diff --git") || params.diffOrMessage.includes("@@")
      ? `Git diff (may be truncated):\n\n${params.diffOrMessage}`
      : `Change description:\n\n${params.diffOrMessage}`

  const hint = params.scopeHint?.trim() ? `\n\nScope hint: ${params.scopeHint.trim()}` : ""
  const style = params.style === "subject-only" ? "\n\nOutput: subject line only." : ""

  // Set GROQ_API_KEY environment variable for the groq client
  process.env.GROQ_API_KEY = params.apiKey
  const { text } = await generateText({
    model: groq(params.model),
    temperature: 0.1,
    system: COMMIT_SYSTEM_PROMPT,
    prompt: `${userContent}${hint}${style}`,
  })

  return text.trim()
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as CommitRequest
    const diffOrMessage = (body.diff || body.message || "").trim()

    if (!diffOrMessage) {
      return NextResponse.json({ error: "Missing diff or message" }, { status: 400 })
    }

    const settings = await getUserSettings(user.id)
    if (!settings) {
      return NextResponse.json(
        { error: "Missing settings. Configure providers in Settings." },
        { status: 400 },
      )
    }

    const commitProvider = (settings.commit_provider || "ollama").toLowerCase()

    if (commitProvider === "ollama") {
      const endpoint = resolveOllamaEndpoint(settings.ollama_endpoint)
      const resolved = await resolveOllamaModel({
        endpoint,
        configuredModel: settings.commit_model || settings.ai_model || "auto",
        purpose: "commit",
      })

      try {
        const commitMessage = await generateWithOllama({
          endpoint,
          model: resolved.model,
          diffOrMessage,
          scopeHint: body.scopeHint,
          style: body.style,
        })
        return NextResponse.json({ commitMessage, usedModel: resolved.model })
      } catch (err) {
        if (looksLikeOllamaModelNotFound(err)) {
          const fallback = await resolveOllamaModel({ endpoint, configuredModel: "auto", purpose: "commit" })
          const commitMessage = await generateWithOllama({
            endpoint,
            model: fallback.model,
            diffOrMessage,
            scopeHint: body.scopeHint,
            style: body.style,
          })
          return NextResponse.json({ commitMessage, usedModel: fallback.model })
        }
        throw err
      }
    }

    // Groq fallback
    const groqKey = settings.groq_api_key
    if (!groqKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 400 })
    }

    const resolved = await resolveGroqModel({ apiKey: groqKey, configuredModel: settings.commit_model || settings.ai_model || "auto", purpose: "commit" })
    const model = resolved.model
    const commitMessage = await generateWithGroq({
      apiKey: groqKey,
      model,
      diffOrMessage,
      scopeHint: body.scopeHint,
      style: body.style,
    })

    return NextResponse.json({ commitMessage })
  } catch (error) {
    console.error("[app] Commit generation error:", error)
    const message = error instanceof Error ? error.message : "Failed to generate commit message"
    const status = message.toLowerCase().includes("not configured") || message.toLowerCase().includes("ollama") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
