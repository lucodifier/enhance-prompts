import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { PrChat } from "@/components/pr/pr-chat"
import { getCurrentUser } from "@/lib/auth"
import { getUserSettings } from "@/lib/data"

export default async function PullRequestsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const settings = await getUserSettings(user.id)
  const defaultTemplate = settings?.pr_template || null

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">PR message</h1>
          <p className="mt-2 text-gray-600">Gere uma descrição de Pull Request a partir de diffs/commits</p>
        </div>
        <PrChat defaultTemplate={defaultTemplate} />
      </main>
    </div>
  )
}
