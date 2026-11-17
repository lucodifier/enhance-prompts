"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, Search, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Prompt = {
  id: string
  original_prompt: string
  enhanced_prompt: string
  created_at: string
}

export function PromptHistoryList({ prompts }: { prompts: Prompt[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.original_prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.enhanced_prompt.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt pair?")) return

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("[app] Delete error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prompts..."
          className="border-gray-200 bg-white pl-10 text-gray-900 placeholder:text-gray-500"
        />
      </div>

      {filteredPrompts.length === 0 ? (
        <Card className="border-gray-200 bg-white">
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-gray-600">
              {searchQuery
                ? "No prompts found matching your search."
                : "No saved prompts yet. Start by enhancing a prompt!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900">
                      {prompt.original_prompt.slice(0, 100)}
                      {prompt.original_prompt.length > 100 && "..."}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {expandedId === prompt.id ? "—" : "+"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(prompt.id)}
                      className="text-red-600 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedId === prompt.id && (
                <CardContent className="space-y-4 border-t border-gray-200 pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Original Prompt</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(prompt.original_prompt, `${prompt.id}-original`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {copiedId === `${prompt.id}-original` ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-4">
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{prompt.original_prompt}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Enhanced Prompt</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(prompt.enhanced_prompt, `${prompt.id}-enhanced`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {copiedId === `${prompt.id}-enhanced` ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-4">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                        {prompt.enhanced_prompt}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
