// next-types.d.ts
import { NextRequest, NextResponse } from 'next/server';

// Comprehensive type definitions for route handlers
declare module 'next/server' {
  export interface RouteHandlerContext<P extends Record<string, string> = {}> {
    params: P;
  }

  export type RouteHandler<Params extends Record<string, string> = {}> = (
    request: NextRequest,
    context: { params: Params }
  ) => Promise<NextResponse> | NextResponse;

  export interface RouteHandlerConfig {
    dynamic?: 'auto' | 'force-cache' | 'no-cache' | 'no-store';
    revalidate?: number | false;
    fetchCache?: 'auto' | 'default-cache' | 'only-cache' | 'force-cache' | 'force-no-store' | 'default-no-store';
  }
}

// Extend global types for comprehensive type safety
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}