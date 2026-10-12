import { NextResponse } from "next/server";
import { COOKIE, humanCheckEnabled, makePass, verifyToken } from "@/lib/human";

export async function POST(req: Request) {
  if (!humanCheckEnabled()) return NextResponse.json({ ok: true });
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0];
  if (!token || !(await verifyToken(token, ip))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const pass = makePass();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, pass.value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: pass.maxAge });
  return res;
}
