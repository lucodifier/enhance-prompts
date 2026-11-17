"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"
import { resolveOllamaEndpoint, ollamaChat } from "@/lib/ollama"
import { resolveGroqModel, resolveOllamaModel, looksLikeOllamaModelNotFound } from "@/lib/ai-models"

const ENHANCEMENT_SYSTEM_PROMPT = `Você é um arquiteto(a) de software que transforma um pedido curto em um ÚNICO prompt final, pronto para colar em uma IA de vibecoding dentro do VS Code (com acesso ao repositório).

Objetivo: maximizar a chance de a IA executar a alteração corretamente, usando o mínimo de tokens possível.

Regras de saída:
- Saída APENAS em Markdown, sem explicações fora do prompt final.
- Não repita o pedido original nem o contexto literalmente: extraia e compacte.
- Seja objetivo. Evite parágrafos longos; use listas.
- Mantenha o prompt final entre 350 e 700 palavras.
- Se houver ambiguidade (ex.: você não sabe o caminho do arquivo), a primeira tarefa deve ser “localizar” via busca no repo.
- O prompt final deve terminar obrigatoriamente na seção # Acceptance criteria (não inclua seções como # Verification ou # Output requirements).

Você receberá:
- TASK: pedido bruto do usuário
- CONTEXT_PACK (opcional): notas, caminhos, trechos de código, convenções
- MODE: direct | two-phase

Estrutura obrigatória do prompt final:

# Goal
(1 frase)

# Context
- (apenas fatos úteis: stack, rotas, padrões já existentes, caminhos suspeitos, etc.)
- (se houver CONTEXT_PACK, cite os trechos relevantes sem copiar tudo)

# Constraints
- (minimizar alterações; manter padrões; não quebrar build; sem refactors desnecessários)
- (se houver DB: scripts de migração em /scripts)

# Tasks
- (lista ordenada de passos, cada um acionável)

# Acceptance criteria
- (bullets verificáveis)

Se MODE=two-phase, adapte a seção #Tasks para ter:
## Phase 1 — Discover
- (localizar arquivos/rotas/queries; listar plano e arquivos alvo; sem editar)
## Phase 2 — Implement
- (executar mudanças; atualizar testes; produzir diff)
`

const CAVEMAN_PROMPT_ADDENDUM = `

CRÍTICO: Responda de forma extremamente concisa, como um "caveman" (homem das cavernas) inteligente. Mantenha toda a substância técnica e código exatos. Elimine qualquer redundância, artigo ou conectivo desnecessário.
Regras do Modo Caveman:
- Ignore a regra de tamanho de 350 a 700 palavras. O prompt final deve ser o mais conciso e comprimido possível (economia extrema de tokens).
- Remova artigos (o, a, os, as, um, uma, uns, umas).
- Remova palavras de preenchimento e conectivos supérfluos (apenas, realmente, basicamente, com o objetivo de, etc.).
- Use frases curtas, fragmentos e palavras diretas.
- Padrão: [item/contexto] [ação necessária] [motivo].
- Exemplo de resposta normal (ruim):
  # Goal
  O objetivo desta tarefa é renomear a função getUser para fetchUser no arquivo de serviços para manter a consistência da API.
- Exemplo de resposta comprimida Caveman (bom):
  # Goal
  Renomear getUser para fetchUser em serviços para consistência API.
`

async function fetchUserSettings() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  return getUserSettings(user.id)
}

export type EnhancePromptParams = {
  task: string
  contextPack?: string
  mode?: "direct" | "two-phase"
  useCaveman?: boolean
}

export async function enhancePrompt(params: EnhancePromptParams): Promise<string> {
  try {
    const settings = await fetchUserSettings()

    const task = params.task?.trim() || ""
    const contextPack = params.contextPack?.trim() || ""
    const mode = params.mode || "direct"
    const useCaveman = params.useCaveman !== undefined ? params.useCaveman : (settings?.use_caveman ?? false)

    if (!task) {
      throw new Error("Missing task")
    }

    const payload = `TASK:\n${task}\n\nMODE: ${mode}\n${contextPack ? `\nCONTEXT_PACK:\n${contextPack}\n` : ""}`
    const groqApiKey = settings?.groq_api_key || process.env.GROQ_API_KEY
    const ollamaEndpoint = resolveOllamaEndpoint(settings?.ollama_endpoint)
    const modelFromSettings = settings?.ai_model?.trim()

    const provider =
      settings?.ai_provider?.trim() ||
      (groqApiKey ? "groq" : ollamaEndpoint ? "ollama" : "groq")

    let systemPrompt = ENHANCEMENT_SYSTEM_PROMPT
    if (useCaveman) {
      systemPrompt = systemPrompt.replace(
        "- Mantenha o prompt final entre 350 e 700 palavras.",
        "- Mantenha o prompt final o mais curto, denso e direto possível, sem tamanho mínimo, priorizando economia extrema de tokens (estilo Caveman)."
      ) + CAVEMAN_PROMPT_ADDENDUM
    }

    if (provider === "groq") {
      if (!groqApiKey) {
        throw new Error("Groq API key is not set. Add it em Settings.")
      }
      const { model: modelName } = await resolveGroqModel({ apiKey: groqApiKey, configuredModel: modelFromSettings, purpose: "prompt" })
      // Set GROQ_API_KEY environment variable for the groq client
      process.env.GROQ_API_KEY = groqApiKey
      const model = groq(modelName)
      try {
        const { text } = await generateText({
          model,
          prompt: payload,
          system: systemPrompt,
          maxOutputTokens: 1400,
          temperature: 0.5,
        })
        return text
      } catch (error) {
        console.error("[app] Groq error:", error)
        throw error
      }
    }

    // Ollama (local)
    if (provider === "ollama") {
      const endpoint = ollamaEndpoint || resolveOllamaEndpoint()
      const resolved = await resolveOllamaModel({ endpoint, configuredModel: modelFromSettings, purpose: "prompt" })

      try {
        const text = await ollamaChat({
          endpoint,
          model: resolved.model,
          maxTokens: 1400,
          temperature: 0.5,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: payload },
          ],
        })
        return text
      } catch (err) {
        // If the configured model isn't installed anymore, retry using auto-picked model list.
        if (looksLikeOllamaModelNotFound(err)) {
          const fallback = await resolveOllamaModel({ endpoint, configuredModel: "auto", purpose: "prompt" })
          const text = await ollamaChat({
            endpoint,
            model: fallback.model,
            maxTokens: 1400,
            temperature: 0.5,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: payload },
            ],
          })
          return text
        }
        throw err
      }
    }

    throw new Error("Unsupported provider. Atualize nas Settings.")
  } catch (error) {
    console.error("[app] Error enhancing prompt:", error)
    const message = error instanceof Error ? error.message : "Failed to enhance prompt"
    throw new Error(message)
  }
}
