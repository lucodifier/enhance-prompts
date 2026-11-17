import { PromptEnhancer } from "@/components/prompt/prompt-enhancer"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const settings = user ? await getUserSettings(user.id) : null
  const defaultUseCaveman = settings?.use_caveman ?? false

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Prompt Enhancer</h1>
          <p className="mt-2 text-gray-600">Transform basic requests into detailed professional prompts</p>
        </div>
        <PromptEnhancer defaultUseCaveman={defaultUseCaveman} />
      </main>
    </div>
  )
}
