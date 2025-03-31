"use client"

// Removendo o SessionProvider duplicado e usando apenas o provider global do app/providers.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}