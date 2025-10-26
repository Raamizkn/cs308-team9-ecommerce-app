import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // For now, we'll handle auth checks in the pages themselves
  // Middleware in Next.js has limitations with external packages

  return NextResponse.next()
}

export const config = {
  matcher: ["/profile/:path*", "/orders/:path*", "/admin/:path*"],
}
