import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SideNav } from "@/components/side-nav"
import { UserNav } from "@/components/user-nav"

export const metadata: Metadata = {
  title: "WorkflowApp",
  description: "Gerenciamento de Treinamentos e Tickets",
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen">
      <SideNav />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-end px-4">
          <UserNav />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
