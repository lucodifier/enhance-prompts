export type AiProvider = "groq" | "ollama"

type TimeoutOptions = { timeoutMs?: number }

function isBlank(value?: string | null) {
  return !value || !value.trim()
}

export function isAutoModel(value?: string | null) {
  if (isBlank(value)) return true
  return value!.trim().toLowerCase() === "auto"
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  const signals = [ctrl.signal]
  if (signal) signals.push(signal)
  // AbortSignal.any is not available in all runtimes; implement minimal combine:
  const combined = new AbortController()
  const onAbort = () => combined.abort()
  for (const s of signals) {
    if (s.aborted) combined.abort()
    else s.addEventListener("abort", onAbort, { once: true })
  }
  return { signal: combined.signal, cleanup: () => clearTimeout(id) }
}

async function fetchJson<T>(url: string, init: RequestInit, opts?: TimeoutOptions): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 6500
  const { signal, cleanup } = withTimeout(init.signal as AbortSignal | undefined, timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }
    return (await res.json()) as T
  } finally {
    cleanup()
  }
}

export async function listGroqModels(apiKey: string, opts?: TimeoutOptions): Promise<string[]> {
  // Groq is OpenAI-compatible. This endpoint returns { data: [{ id: string, ... }] }
  const json = await fetchJson<{ data?: Array<{ id?: string }> }>(
    "https://api.groq.com/openai/v1/models",
    { headers: { Authorization: `Bearer ${apiKey}` } },
    opts,
  )

  const ids = (json.data || []).map((m) => (m.id || "").trim()).filter(Boolean)
  // stable-ish ordering for UI/debug
  return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b))
}

export async function listOllamaModels(endpoint: string, opts?: TimeoutOptions): Promise<string[]> {
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint
  const url = `${base}/api/tags`
  const json = await fetchJson<{ models?: Array<{ name?: string }> }>(url, {}, opts)
  const names = (json.models || []).map((m) => (m.name || "").trim()).filter(Boolean)
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}

function scoreModel(id: string, purpose: "prompt" | "commit" | "pr") {
  const s = id.toLowerCase()
  let score = 0

  // prefer coder-ish models for commit/pr
  if (purpose !== "prompt") {
    if (s.includes("coder") || s.includes("code")) score += 60
  }

  if (s.includes("70b")) score += 40
  if (s.includes("32b")) score += 25
  if (s.includes("13b")) score += 15
  if (s.includes("8b")) score += 10

  // Prefer llama for general, qwen for code
  if (s.includes("llama")) score += 10
  if (s.includes("qwen")) score += 12
  if (s.includes("deepseek")) score += 14

  // avoid embeddings/vision/speech
  if (s.includes("embed") || s.includes("embedding")) score -= 100
  if (s.includes("vision")) score -= 30
  if (s.includes("whisper") || s.includes("audio")) score -= 30

  // avoid too small for prompt quality
  if (purpose === "prompt" && (s.includes("1b") || s.includes("3b"))) score -= 25

  return score
}

export function pickBestModel(models: string[], purpose: "prompt" | "commit" | "pr", preferred?: string | null) {
  if (!models.length) return null
  if (preferred && !isAutoModel(preferred) && models.includes(preferred.trim())) return preferred.trim()

  // heuristic: prefer a commonly-recommended Groq model if present
  const groqTop = models.find((m) => m === "llama-3.3-70b-versatile")
  if (groqTop) return groqTop

  // Otherwise score
  let best = models[0]
  let bestScore = scoreModel(best, purpose)
  for (const m of models) {
    const sc = scoreModel(m, purpose)
    if (sc > bestScore) {
      best = m
      bestScore = sc
    }
  }
  return best
}

export async function resolveGroqModel(params: { apiKey: string; configuredModel?: string | null; purpose: "prompt" | "commit" | "pr" }) {
  const configured = params.configuredModel?.trim()
  if (configured && !isAutoModel(configured)) {
    return { model: configured, resolvedFrom: "configured" as const }
  }

  try {
    const models = await listGroqModels(params.apiKey)
    const picked = pickBestModel(models, params.purpose, configured) || "llama-3.3-70b-versatile"
    return { model: picked, resolvedFrom: "auto" as const, available: models }
  } catch (e) {
    // fallback to a reasonable default; user can override in Settings
    return { model: "llama-3.3-70b-versatile", resolvedFrom: "fallback" as const }
  }
}

export async function resolveOllamaModel(params: {
  endpoint: string
  configuredModel?: string | null
  purpose: "prompt" | "commit" | "pr"
}) {
  const configured = params.configuredModel?.trim()
  if (configured && !isAutoModel(configured)) {
    return { model: configured, resolvedFrom: "configured" as const }
  }

  const models = await listOllamaModels(params.endpoint)
  const picked = pickBestModel(models, params.purpose, configured)
  if (!picked) {
    throw new Error(
      `Nenhum modelo encontrado no Ollama (${params.endpoint}). Rode "ollama pull <modelo>" e salve o nome do modelo em Settings (ou use auto).`,
    )
  }
  return { model: picked, resolvedFrom: "auto" as const, available: models }
}

export function looksLikeOllamaModelNotFound(err: unknown) {
  const msg = (err as any)?.message?.toString?.() || ""
  return msg.includes("model") && msg.toLowerCase().includes("not found")
}
