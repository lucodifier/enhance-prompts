"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useState } from "react"

export function DashboardNav() {
  const { data } = useSession()
  const avatarUrl = data?.user?.image
  const [avatarError, setAvatarError] = useState(false)

  return (
    <nav className="border-b border-gray-200 bg-gray-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
            Prompt Enhancer
          </Link>
          <Link href="/dashboard/commits" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            Commits message
          </Link>
          <Link href="/dashboard/pull-requests" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            PR message
          </Link>
          <Link href="/dashboard/history" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            History
          </Link>
          <Link href="/dashboard/settings" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt="User avatar"
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-medium text-gray-700">
              {data?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-700 hover:text-gray-900"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
