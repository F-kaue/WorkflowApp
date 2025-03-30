"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, CalendarCheck, Ticket, Bot } from "lucide-react"

const routes = [
  {
    label: "Início",
    icon: Home,
    href: "/",
  },
  {
    label: "Treinamentos",
    icon: CalendarCheck,
    href: "/treinamentos",
  },
  {
    label: "Tickets",
    icon: Ticket,
    href: "/tickets",
  },
  {
    label: "Assistente IA",
    icon: Bot,
    href: "/assistente",
  },
]

export function SideNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="w-[240px] flex flex-col bg-secondary border-r border-border/50">
      <div className="p-6">
        <h1 className="text-xl font-bold">WorkflowApp</h1>
      </div>

      <nav className="flex-1 px-2">
        {routes.map((route) => (
          <button
            key={route.href}
            onClick={() => router.push(route.href)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-secondary-foreground transition-all hover:bg-secondary-foreground/10 mb-1",
              pathname === route.href || pathname.startsWith(route.href + "/")
                ? "bg-secondary-foreground/10"
                : ""
            )}
          >
            <route.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{route.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}