declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    NEXTAUTH_SECRET: string
    NEXTAUTH_URL?: string
  }
}

