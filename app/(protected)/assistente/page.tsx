"use client"

import { AssistenteIAFullPage } from "@/components/assistente-ia-full-page"

export default function AssistentePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Assistente IA</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <AssistenteIAFullPage />
      </div>
    </div>
  )
}