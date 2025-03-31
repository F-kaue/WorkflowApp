"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: any
}) {
  return (
    <NextAuthSessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  )
}