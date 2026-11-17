"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

type Settings = {
  ai_provider: string
  groq_api_key: string | null
  ollama_endpoint: string
  ai_model: string | null
  commit_provider: string | null
  commit_model: string | null
  pr_provider: string | null
  pr_model: string | null
  pr_template: string | null
  use_caveman: boolean | null
} | null

export function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const { toast } = useToast()
  const [provider, setProvider] = useState(initialSettings?.ai_provider || "groq")
  const [groqApiKey, setGroqApiKey] = useState(initialSettings?.groq_api_key || "")
  const [ollamaEndpoint, setOllamaEndpoint] = useState(initialSettings?.ollama_endpoint || "http://localhost:11434")
  const [aiModel, setAiModel] = useState(initialSettings?.ai_model || "")
  const [commitProvider, setCommitProvider] = useState(initialSettings?.commit_provider || "ollama")
  const [commitModel, setCommitModel] = useState(initialSettings?.commit_model || "")
  const [prProvider, setPrProvider] = useState(initialSettings?.pr_provider || "groq")
  const [prModel, setPrModel] = useState(initialSettings?.pr_model || "")
  const [prTemplate, setPrTemplate] = useState(
    initialSettings?.pr_template ||
      `## Card\nLink: https://agroplay.atlassian.net/browse/HUB-123\n\n## O que foi feito\n[descrição objetiva]\n\n## Como testar\n[passos para validação]\n\n## Evidências\n[prints, vídeos, logs]\n\n## Impactos conhecidos\n[breaking changes, dependências]\n\n## Checklist\n- [ ] Testes automatizados adicionados/atualizados\n- [ ] Documentação atualizada (se aplicável)\n- [ ] Sem secrets/credenciais no código\n- [ ] CI passou (build, testes, lint, security)\n`,
  )
  const [useCaveman, setUseCaveman] = useState(initialSettings?.use_caveman || false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_provider: provider,
          groq_api_key: groqApiKey || null,
          // Keep the endpoint always saved because other features can use Ollama even if the prompt provider is not Ollama
          ollama_endpoint: ollamaEndpoint || null,
          ai_model: aiModel || null,
          commit_provider: commitProvider || null,
          commit_model: commitModel || null,
          pr_provider: prProvider || null,
          pr_model: prModel || null,
          pr_template: prTemplate || null,
          use_caveman: useCaveman,
        }),
      })

      if (response.ok) {
        toast({
          title: "Settings saved successfully!",
          description: "Your configuration has been updated.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to save settings",
          description: "Please try again.",
        })
      }
    } catch (error) {
      console.error("[app] Settings save error:", error)
      toast({
        variant: "destructive",
        title: "Error saving settings",
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Save Button at Top */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Prompt Generator</CardTitle>
          <CardDescription className="text-gray-600">
            Configure which provider/model will be used to generate the “perfect prompt” for vibecoding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={provider} onValueChange={setProvider}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groq" id="groq" />
              <Label htmlFor="groq" className="text-gray-900">
                Groq (direto)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ollama" id="ollama" />
              <Label htmlFor="ollama" className="text-gray-900">
                Ollama (Local/Self-hosted)
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="ai-model" className="text-gray-700">
              Modelo
            </Label>
            <Input
              id="ai-model"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder={
                provider === "groq"
                  ? "ex.: llama-3.3-70b-versatile (ou auto)"
                  : "ex.: llama3 (ou auto)"
              }
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-sm text-gray-600">Informe o modelo conforme o provedor escolhido.</p>
          </div>

          {provider === "groq" && (
            <div className="space-y-2">
              <Label htmlFor="groq-key" className="text-gray-700">
                Groq API Key (Direto)
              </Label>
              <Input
                id="groq-key"
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
              />
              <p className="text-sm text-gray-600">Usado para chamadas diretas ao Groq (bypassa gateway).</p>
            </div>
          )}



          {provider === "ollama" && (
            <div className="space-y-2">
              <Label htmlFor="ollama-endpoint" className="text-gray-700">
                Ollama Endpoint
              </Label>
              <Input
                id="ollama-endpoint"
                type="url"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
              />
              <p className="text-sm text-gray-600">
                Enter the URL of your Ollama instance. Make sure Ollama is running and accessible.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 rounded-md border border-gray-200 p-4">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="use-caveman-switch" className="text-gray-900 font-semibold cursor-pointer">
                Modo Caveman (Token-saver)
              </Label>
              <p className="text-sm text-gray-600">
                Simplifica e compacta prompts gerados, reduzindo drasticamente o consumo de tokens na IA de destino.
              </p>
            </div>
            <Switch
              id="use-caveman-switch"
              checked={useCaveman}
              onCheckedChange={setUseCaveman}
            />
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-2">Token-saver tip</p>
            <p>
              Para reduzir tokens, o gerador de prompt foi ajustado para produzir um "prompt de execução" curto, com
              escopo, restrições e critérios de aceite. Quando necessário, cole um "context pack" mínimo (paths + trechos)
              em vez de arquivos inteiros.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Commit Generator</CardTitle>
          <CardDescription className="text-gray-600">
            Configure provider/model para gerar mensagens de commit a partir de <span className="font-mono">git diff</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={commitProvider} onValueChange={setCommitProvider}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ollama" id="commit-ollama" />
              <Label htmlFor="commit-ollama" className="text-gray-900">
                Ollama (local)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groq" id="commit-groq" />
              <Label htmlFor="commit-groq" className="text-gray-900">
                Groq (fallback)
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="commit-model" className="text-gray-700">
              Modelo (Commits)
            </Label>
            <Input
              id="commit-model"
              value={commitModel}
              onChange={(e) => setCommitModel(e.target.value)}
              placeholder={commitProvider === "ollama" ? "ex.: llama3" : "ex.: llama-3.1-8b-instant"}
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-sm text-gray-600">
              Recomendação: use Ollama para commits (barato e privado). Você pode manter Groq como fallback.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ollama-endpoint-commit" className="text-gray-700">
              Ollama Endpoint
            </Label>
            <Input
              id="ollama-endpoint-commit"
              type="url"
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-sm text-gray-600">
              Se o app estiver rodando em container e o Ollama no host, tente <span className="font-mono">http://host.docker.internal:11434</span>.
            </p>
          </div>

          <Alert className="border-gray-200 bg-gray-50">
            <AlertDescription className="text-gray-700">
              Para gerar commits com mais precisão e menos tokens, envie o diff staged:
              <span className="block font-mono mt-2">git add -A</span>
              <span className="block font-mono">git diff --staged</span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">PR Generator</CardTitle>
          <CardDescription className="text-gray-600">Gere uma descrição de Pull Request em Markdown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={prProvider} onValueChange={setPrProvider}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groq" id="pr-groq" />
              <Label htmlFor="pr-groq" className="text-gray-900">
                Groq
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ollama" id="pr-ollama" />
              <Label htmlFor="pr-ollama" className="text-gray-900">
                Ollama
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="pr-model" className="text-gray-700">
              Modelo (PR)
            </Label>
            <Input
              id="pr-model"
              value={prModel}
              onChange={(e) => setPrModel(e.target.value)}
              placeholder={prProvider === "ollama" ? "ex.: llama3" : "ex.: llama-3.1-8b-instant"}
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr-template" className="text-gray-700">
              Template (Markdown)
            </Label>
            <textarea
              id="pr-template"
              value={prTemplate}
              onChange={(e) => setPrTemplate(e.target.value)}
              className="min-h-[180px] w-full resize-y rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-sm text-gray-600">
              Esse template será usado como base para o gerador de PR. O modelo irá preencher as seções com base no diff/commits.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">About AI Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="mb-1 font-semibold text-gray-800">Groq (Direto)</h4>
            <p>
              Usa modelos Groq diretamente com sua chave gsk_. Configure o modelo ex.: llama-3.3-70b-versatile.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-gray-800">Ollama (Local)</h4>
            <p>
              Run AI models locally using Ollama. Free and private, but requires Ollama installed on your machine. Good
              for development and offline use.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button at Bottom - Outside all cards */}
      <div className="flex justify-center pt-6 border-t border-gray-200">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  )
}
