export type OllamaChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export function getDefaultOllamaEndpoint() {
  return process.env.OLLAMA_ENDPOINT || "http://localhost:11434"
}

export function resolveOllamaEndpoint(settingsValue?: string | null) {
  const envEndpoint = getDefaultOllamaEndpoint()
  const configured = settingsValue?.trim()

  // If the user saved localhost but an env override exists (e.g., inside Docker), prefer the env endpoint.
  if (configured && envEndpoint && configured.startsWith("http://localhost:11434")) {
    return envEndpoint
  }

  return configured || envEndpoint || "http://localhost:11434"
}

type OllamaChatResponse = {
  message?: { role?: string; content?: string }
  response?: string
  done?: boolean
}

function toOllamaUrl(base: string, path: string) {
  const normalized = base.endsWith("/") ? base : `${base}/`
  return new URL(path.replace(/^\//, ""), normalized).toString()
}

export async function ollamaChat(params: {
  endpoint: string
  model: string
  messages: OllamaChatMessage[]
  temperature?: number
  maxTokens?: number
  keepAlive?: string
}): Promise<string> {
  const url = toOllamaUrl(params.endpoint, "/api/chat")

  const body = {
    model: params.model,
    messages: params.messages,
    stream: false,
    keep_alive: params.keepAlive ?? "5m",
    options: {
      temperature: params.temperature ?? 0.2,
      num_predict: params.maxTokens ?? 512,
    },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000), // 120s timeout for PR generation
    })
  } catch (fetchError) {
    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Ollama connection timeout. Verifique se o servidor está respondendo.')
      }
      if (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('connection refused')) {
        throw new Error(`Ollama não está rodando em ${params.endpoint}. Inicie o Ollama ou verifique o endpoint em Configurações.`)
      }
      if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('getaddrinfo')) {
        throw new Error(`Endpoint Ollama inválido: ${params.endpoint}. Verifique o URL em Configurações.`)
      }
    }
    throw new Error(`Erro ao conectar com Ollama: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    if (res.status === 404) {
      throw new Error(`Modelo "${params.model}" não encontrado no Ollama. Verifique os modelos disponíveis.`)
    }
    if (res.status >= 500) {
      throw new Error(`Erro interno do Ollama (${res.status}): ${text || res.statusText}`)
    }
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  const json = (await res.json()) as OllamaChatResponse
  const content = json.message?.content ?? json.response
  if (!content) {
    throw new Error("Ollama response did not contain message content")
  }

  return content
}
