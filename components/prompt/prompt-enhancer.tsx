"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { enhancePrompt } from "@/app/actions/prompt-actions"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, Copy, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { copyToClipboard } from "@/lib/utils"

export function PromptEnhancer({ defaultUseCaveman = false }: { defaultUseCaveman?: boolean }) {
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [contextPack, setContextPack] = useState("")
  const [mode, setMode] = useState<"direct" | "two-phase">("direct")
  const [useCaveman, setUseCaveman] = useState(defaultUseCaveman)
  const [enhancedPrompt, setEnhancedPrompt] = useState("")
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedOriginal, setCopiedOriginal] = useState(false)
  const [copiedEnhanced, setCopiedEnhanced] = useState(false)
  const router = useRouter()

  const handleEnhance = async () => {
    if (!originalPrompt.trim()) return

    setIsEnhancing(true)
    setEnhancedPrompt("")

    try {
      const enhanced = await enhancePrompt({ task: originalPrompt, contextPack, mode, useCaveman })
      setEnhancedPrompt(enhanced)
    } catch (error) {
      console.error("[app] Enhancement error:", error)
      const message = error instanceof Error ? error.message : "não foi possível gerar o prompt"
      setEnhancedPrompt(`Erro: ${message}. Verifique as configurações de IA em Settings.`)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleCopy = async (text: string, type: "original" | "enhanced") => {
    const success = await copyToClipboard(text)
    if (success) {
      if (type === "original") {
        setCopiedOriginal(true)
        setTimeout(() => setCopiedOriginal(false), 2000)
      } else {
        setCopiedEnhanced(true)
        setTimeout(() => setCopiedEnhanced(false), 2000)
      }
    }
  }

  const handleSave = async () => {
    if (!originalPrompt.trim() || !enhancedPrompt.trim()) return

    const originalToSave = contextPack.trim()
      ? `TASK:\n${originalPrompt}\n\nCONTEXT_PACK:\n${contextPack}`
      : originalPrompt

    setIsSaving(true)
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalPrompt: originalToSave,
          enhancedPrompt,
        }),
      })

      if (response.ok) {
        router.push("/dashboard/history")
      }
    } catch (error) {
      console.error("[app] Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Pedido da tarefa</CardTitle>
          <CardDescription className="text-gray-600">
            Descreva a mudança em poucas linhas. Opcionalmente, cole um Context Pack (paths, trechos, convenções) para reduzir
            ambiguidades.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Modo</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="mode-direct" />
                <Label htmlFor="mode-direct" className="text-gray-900">
                  Direct (já implementar)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="two-phase" id="mode-two-phase" />
                <Label htmlFor="mode-two-phase" className="text-gray-900">
                  Two-phase (descobrir &gt; implementar)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2 py-1">
            <Checkbox
              id="use-caveman-enhancer"
              checked={useCaveman}
              onCheckedChange={(checked) => setUseCaveman(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="use-caveman-enhancer"
                className="text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Comprimir com Caveman (Economizar tokens)
              </label>
              <p className="text-xs text-gray-500">
                Gera o prompt final otimizado no estilo direto do Caveman.
              </p>
            </div>
          </div>

          <Textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder={'Ex.: Renomear o campo "nome" para "título" na rota /users, mantendo compatibilidade com validações, API e UI.'}
            className="min-h-[300px] resize-none border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
          />

          <div className="space-y-2">
            <Label htmlFor="context-pack" className="text-gray-700">
              Context Pack (opcional)
            </Label>
            <Textarea
              id="context-pack"
              value={contextPack}
              onChange={(e) => setContextPack(e.target.value)}
              placeholder={
                "Cole paths/trechos relevantes para reduzir tokens depois. Ex.:\n- app/users/page.tsx\n- API: app/api/users/route.ts\n- Convenção: usar Zod para validação\n- DB: scripts em /scripts"
              }
              className="min-h-[160px] resize-none border-gray-200 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEnhance} disabled={isEnhancing || !originalPrompt.trim()} className="flex-1">
              {isEnhancing ? "Gerando..." : "Gerar prompt final"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(originalPrompt, "original")}
              disabled={!originalPrompt.trim()}
              className="border-gray-200 text-gray-700 hover:text-gray-900"
            >
              {copiedOriginal ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">Prompt final</CardTitle>
          <CardDescription className="text-gray-600">Pronto para colar na sua IA (Copilot/Gemini/Amazon Q/Continue/Codex)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[300px] rounded-md border border-gray-200 bg-white p-4">
            {isEnhancing ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  <span>Gerando prompt...</span>
                </div>
              </div>
            ) : enhancedPrompt ? (
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">{enhancedPrompt}</pre>
            ) : (
              <p className="text-gray-500">O prompt final aparecerá aqui...</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !enhancedPrompt.trim()}
              className="flex-1"
              variant="secondary"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar par"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(enhancedPrompt, "enhanced")}
              disabled={!enhancedPrompt.trim()}
              className="border-gray-200 text-gray-700 hover:text-gray-900"
            >
              {copiedEnhanced ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
