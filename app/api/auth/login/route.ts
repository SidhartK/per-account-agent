import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.AUTH_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = Buffer.from(process.env.AUTH_SECRET || "fallback-secret")
    .toString("base64")
    .slice(0, 32);

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
