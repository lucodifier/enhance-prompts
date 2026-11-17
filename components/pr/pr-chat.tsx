"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { copyToClipboard } from "@/lib/utils"

const DEFAULT_TEMPLATE = `## Card
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

export function PrChat({ defaultTemplate }: { defaultTemplate?: string | null }) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [diff, setDiff] = useState("")
  const [commits, setCommits] = useState("")
  const [context, setContext] = useState("")
  const [template, setTemplate] = useState(defaultTemplate || DEFAULT_TEMPLATE)

  const [output, setOutput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setOutput("")

    try {
      const res = await fetch("/api/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, diff, commits, context, template }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to generate PR message")
      }

      const data = await res.json()
      setOutput(data.prBody || "")
      toast({
        title: "PR message generated!",
        description: "Your pull request message has been created successfully.",
      })
    } catch (e: any) {
      setOutput(`Erro: ${e?.message || "falha ao gerar"}`)
      toast({
        variant: "destructive",
        title: "Failed to generate PR",
        description: e?.message || "An error occurred while generating the PR message.",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!output.trim()) return
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Gerar mensagem de PR</CardTitle>
          <CardDescription className="text-gray-600">
            Cole diffs e/ou commits. Quanto melhor o diff, melhor o resumo.
            <div className="mt-2 text-xs text-gray-600">
              Sugestões:
              <ul className="list-disc pl-5">
                <li>
                  <span className="font-mono">git diff --staged</span> (se você já addou os arquivos)
                </li>
                <li>
                  <span className="font-mono">git log --oneline origin/main..HEAD</span> (lista commits)
                </li>
                <li>
                  <span className="font-mono">git diff origin/main...HEAD</span> (diff total da branch)
                </li>
              </ul>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pr-title" className="text-gray-700">
              Título (opcional)
            </Label>
            <Input
              id="pr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ex.: feat(users): renomear "nome" para "título"'
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr-diff" className="text-gray-700">
              Diff (recomendado)
            </Label>
            <Textarea
              id="pr-diff"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder="Cole aqui o diff..."
              className="min-h-[220px] resize-none border-gray-200 bg-white font-mono text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr-commits" className="text-gray-700">
              Commits (opcional)
            </Label>
            <Textarea
              id="pr-commits"
              value={commits}
              onChange={(e) => setCommits(e.target.value)}
              placeholder="Cole a lista de commits (oneline)"
              className="min-h-[140px] resize-none border-gray-200 bg-white font-mono text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr-context" className="text-gray-700">
              Contexto extra (opcional)
            </Label>
            <Textarea
              id="pr-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Motivação, issue/jira, decisões, tradeoffs..."
              className="min-h-[120px] resize-none border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pr-template" className="text-gray-700">
              Template (opcional)
            </Label>
            <Textarea
              id="pr-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-[200px] resize-none border-gray-200 bg-white font-mono text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating || (!diff.trim() && !commits.trim() && !context.trim())} className="flex-1">
              {isGenerating ? "Gerando..." : "Gerar mensagem"}
            </Button>
            <Button variant="outline" onClick={() => { setTitle(""); setDiff(""); setCommits(""); setContext(""); setOutput(""); }} className="border-gray-200 text-gray-700">
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Mensagem gerada</CardTitle>
          <CardDescription className="text-gray-600">Copie e cole no GitHub/GitLab/Bitbucket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[300px] rounded-md border border-gray-200 bg-white p-4">
            {isGenerating ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  <span>Gerando mensagem de PR...</span>
                </div>
              </div>
            ) : output ? (
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">{output}</pre>
            ) : (
              <p className="text-gray-500">A saída aparecerá aqui...</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopy} disabled={!output.trim()} className="flex-1" variant="secondary">
              {copied ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Copiado
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4" /> Copiar
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
