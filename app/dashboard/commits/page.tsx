import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { CommitChat } from "@/components/commits/commit-chat"
import { getCurrentUser } from "@/lib/auth"

export default async function CommitsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Commits message</h1>
          <p className="mt-2 text-gray-600">Gere mensagens de commit curtas e diretas</p>
        </div>
        <CommitChat />
      </main>
    </div>
  )
}
