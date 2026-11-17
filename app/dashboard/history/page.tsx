import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { PromptHistoryList } from "@/components/prompt/prompt-history-list"
import { getCurrentUser } from "@/lib/auth"
import { getUserPrompts } from "@/lib/data"

export default async function HistoryPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const prompts = await getUserPrompts(user.id)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Prompt History</h1>
          <p className="mt-2 text-gray-600">View and manage your saved prompt pairs</p>
        </div>
        <PromptHistoryList prompts={prompts} />
      </main>
    </div>
  )
}
