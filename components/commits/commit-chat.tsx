"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Check } from "lucide-react"
import { copyToClipboard } from "@/lib/utils"

type HistoryItem = { prompt: string; commit: string }

export function CommitChat() {
  const { toast } = useToast()
  const [diffText, setDiffText] = useState("")
  const [scopeHint, setScopeHint] = useState("")
  const [style, setStyle] = useState<"conventional" | "subject-only">("conventional")
  const [commit, setCommit] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyCommit = async (text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({
        title: "Copiado!",
        description: "Comando de commit copiado.",
      })
    }
  }

  const handleGenerate = async () => {
    if (!diffText.trim()) return
    setIsLoading(true)
    setError(null)
    setCommit("")

    try {
      const res = await fetch("/api/commits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff: diffText, scopeHint: scopeHint || undefined, style }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to generate commit message")
      }

      const data = (await res.json()) as { commitMessage: string }
      setCommit(data.commitMessage)
      setHistory((prev) => [{ prompt: diffText.slice(0, 120), commit: data.commitMessage }, ...prev])
      toast({
        title: "Commit message generated!",
        description: "Your commit message has been created successfully.",
      })
    } catch (err: any) {
      const isConnectionError =
        err.message?.toLowerCase().includes("fetch") ||
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("connection refused")

      if (isConnectionError) {
        setError(
          "Erro de conexao. Se estiver em container, use http://host.docker.internal:11434 em Configuracoes. Fora do container, verifique se o Ollama esta rodando em http://localhost:11434 e atualize o endpoint.",
        )
      } else {
        setError(err.message || "Erro inesperado ao gerar commit")
      }
      toast({
        variant: "destructive",
        title: "Failed to generate commit",
        description: err.message || "An error occurred while generating the commit message.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Gerar commit a partir de diff</CardTitle>
          <CardDescription className="text-gray-600">
            Cole o <span className="font-mono">git diff --staged</span> para obter uma mensagem precisa (e com menos tokens).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope-hint" className="text-gray-700">
                Scope (opcional)
              </Label>
              <Input
                id="scope-hint"
                value={scopeHint}
                onChange={(e) => setScopeHint(e.target.value)}
                placeholder="ex.: users, auth, ui"
                className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Formato</Label>
              <RadioGroup value={style} onValueChange={(v) => setStyle(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conventional" id="style-conventional" />
                  <Label htmlFor="style-conventional" className="text-gray-900">
                    Conventional + body
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subject-only" id="style-subject" />
                  <Label htmlFor="style-subject" className="text-gray-900">
                    Só subject
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Textarea
            value={diffText}
            onChange={(e) => setDiffText(e.target.value)}
            placeholder={
              "Cole aqui o output de:\n\n  git add -A\n  git diff --staged\n\nDica: se for muito grande, cole só os trechos relevantes."
            }
            className="min-h-[200px] resize-none border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
          />
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isLoading || !diffText.trim()} className="flex-1">
              {isLoading ? "Gerando..." : "Gerar commit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-200 text-gray-700 hover:text-gray-900"
              onClick={() => {
                if (commit) {
                  handleCopyCommit(`git commit -m "${commit.replace(/"/g, '\\"')}"`)
                }
              }}
              disabled={!commit}
            >
              {copied ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" /> Copiado
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4" /> Copiar
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-200 text-gray-700 hover:text-gray-900"
              onClick={() => {
                setDiffText("")
                setScopeHint("")
                setCommit("")
              }}
              disabled={isLoading && !diffText && !commit}
            >
              Limpar
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {commit && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 flex items-center justify-between gap-4">
              <p className="text-sm font-mono text-gray-900 whitespace-pre-wrap flex-1">
                git commit -m "{commit}"
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
                onClick={() => handleCopyCommit(`git commit -m "${commit.replace(/"/g, '\\"')}"`)}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Histórico</CardTitle>
          <CardDescription className="text-gray-600">Commits gerados recentemente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                <span>Gerando mensagem de commit...</span>
              </div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-600">Sem commits gerados ainda.</p>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-500">Diff (trecho)</p>
                <p className="text-sm text-gray-800 mb-2 font-mono whitespace-pre-wrap">{item.prompt}</p>
                <p className="text-xs uppercase text-gray-500">Commit</p>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-mono text-gray-900 whitespace-pre-wrap flex-1">
                    git commit -m "{item.commit}"
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-gray-900"
                    onClick={async () => {
                      const success = await copyToClipboard(`git commit -m "${item.commit.replace(/"/g, '\\"')}"`)
                      if (success) {
                        toast({ title: "Copiado!", description: "Comando de commit copiado." })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
