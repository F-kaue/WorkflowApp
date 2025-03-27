import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  return NextResponse.json({
    session: {
      ...session,
      user: {
        ...session?.user,
        email: session?.user?.email?.replace(/(?<=.{3}).(?=.*@)/g, '*')
      }
    }
  })
} 