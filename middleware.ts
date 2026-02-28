import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return NextResponse.next();
    }
  }

  const sessionCookie = request.cookies.get("session");
  if (!sessionCookie?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const expectedToken = Buffer.from(
    process.env.AUTH_SECRET || "fallback-secret"
  )
    .toString("base64")
    .slice(0, 32);

  if (sessionCookie.value !== expectedToken) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
