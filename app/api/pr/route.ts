import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { resolveOllamaEndpoint, ollamaChat } from "@/lib/ollama"
import { looksLikeOllamaModelNotFound, resolveGroqModel, resolveOllamaModel } from "@/lib/ai-models"

type PrRequest = {
  title?: string
  diff?: string
  commits?: string
  context?: string
  template?: string
}

const DEFAULT_PR_TEMPLATE = `## Card
Link: https://agroplay.atlassian.net/browse/HUB-123

## O que foi feito
[descrição objetiva]

## Como testar
[passos para validação]

## Evidências
[prints, vídeos, logs]

## Impactos conhecidos
[breaking changes, dependências]

## Checklist
- [ ] Testes automatizados adicionados/atualizados
- [ ] Documentação atualizada (se aplicável)
- [ ] Sem secrets/credenciais no código
- [ ] CI passou (build, testes, lint, security)
`

const PR_SYSTEM_PROMPT = `Você é um(a) engenheiro(a) sênior. Gere uma descrição de Pull Request em Markdown.

Objetivo:
- Explicar o que mudou e por quê, de forma concisa e revisável.
- Usar o template fornecido, preenchendo as seções.

Regras:
- Saída somente em Markdown.
- Seja direto; use bullets curtos.
- Não inclua código-fonte completo; cite apenas caminhos.
- Para testes: use "não executado" se não houver evidência.
- Mantenha a resposta concisa (max 800 tokens).
- Foque no essencial, evite detalhes excessivos.
`


export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const settings = await getUserSettings(user.id)

    const body = (await req.json()) as PrRequest

    const title = (body.title || "").trim()
    const diff = (body.diff || "").trim()
    const commits = (body.commits || "").trim()
    const context = (body.context || "").trim()

    if (!diff && !commits && !context) {
      return NextResponse.json({ error: "Provide at least diff, commits, or context" }, { status: 400 })
    }

    const template = (body.template || settings?.pr_template || DEFAULT_PR_TEMPLATE).trim()
    const provider = (settings?.pr_provider || "groq").trim()

    const userPrompt = `PR_TITLE: ${title || "(não informado)"}

TEMPLATE:
${template}

DIFF:
${diff || "(não fornecido)"}

COMMITS:
${commits || "(não fornecido)"}

EXTRA_CONTEXT:
${context || "(não fornecido)"}
`

    if (provider === "ollama") {
      const endpoint = resolveOllamaEndpoint(settings?.ollama_endpoint)
      const resolved = await resolveOllamaModel({
        endpoint,
        configuredModel: settings?.pr_model || settings?.ai_model || "auto",
        purpose: "pr",
      })

      try {
        const prBody = await ollamaChat({
          endpoint,
          model: resolved.model,
          maxTokens: 800,
          temperature: 0.1,
          messages: [
            { role: "system", content: PR_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        })
        return NextResponse.json({ prBody, usedModel: resolved.model })
      } catch (err) {
        if (looksLikeOllamaModelNotFound(err)) {
          const fallback = await resolveOllamaModel({ endpoint, configuredModel: "auto", purpose: "pr" })
          const prBody = await ollamaChat({
            endpoint,
            model: fallback.model,
            maxTokens: 800,
            temperature: 0.1,
            messages: [
              { role: "system", content: PR_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          })
          return NextResponse.json({ prBody, usedModel: fallback.model })
        }
        throw err
      }
    }


    // Default: Groq
    const groqApiKey = settings?.groq_api_key || process.env.GROQ_API_KEY
    if (!groqApiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 400 })
    }

    const resolved = await resolveGroqModel({ apiKey: groqApiKey, configuredModel: settings?.pr_model || settings?.ai_model || "auto", purpose: "pr" })
    // Set GROQ_API_KEY environment variable for the groq client
    process.env.GROQ_API_KEY = groqApiKey
    const model = groq(resolved.model)

    const { text } = await generateText({
      model,
      system: PR_SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: 800,
      temperature: 0.1,
    })

    return NextResponse.json({ prBody: text })
  } catch (error) {
    console.error("[app] Error generating PR message:", error)
    const message = error instanceof Error ? error.message : "Failed to generate PR message"
    const status = message.toLowerCase().includes("not configured") || message.toLowerCase().includes("ollama") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
