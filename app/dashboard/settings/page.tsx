import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { SettingsForm } from "@/components/settings/settings-form"
import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"
import { resolveOllamaEndpoint } from "@/lib/ollama"

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const settings = await getUserSettings(user.id)

  const initial = settings ?? {
    ai_provider: "groq",
    groq_api_key: null,
    ollama_endpoint: resolveOllamaEndpoint(),
    ai_model: "auto",
    commit_provider: "ollama",
    commit_model: "auto",
    pr_provider: "groq",
    pr_model: "auto",
    pr_template: null,
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-2 text-gray-600">Configure your AI provider and API settings</p>
        </div>
        <SettingsForm initialSettings={initial as any} />
      </main>
    </div>
  )
}
