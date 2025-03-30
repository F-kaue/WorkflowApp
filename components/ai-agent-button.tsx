"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AiAgentPanel } from "@/components/ai-agent-panel"

export function AiAgentButton() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-secondary-foreground transition-all hover:bg-secondary-foreground/10 mb-1"
        >
          <Bot className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Assistente IA</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 overflow-y-auto">
        <AiAgentPanel onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}