import { createHmac, timingSafeEqual } from "node:crypto";

// cloudflare turnstile gate. without both keys the gate is off and everything works as before.
export const COOKIE = "wr_h";
const TTL = 30 * 60; // seconds a passed check stays valid

export const humanCheckEnabled = () =>
  Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const sign = (exp: string) =>
  createHmac("sha256", process.env.TURNSTILE_SECRET_KEY ?? "").update(exp).digest("hex").slice(0, 32);

export function makePass(): { value: string; maxAge: number } {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return { value: `${exp}.${sign(exp)}`, maxAge: TTL };
}

export function isValidPass(value: string | undefined): boolean {
  if (!humanCheckEnabled()) return true;
  if (!value) return false;
  const [exp, mac] = value.split(".");
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(mac), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyToken(token: string, ip?: string | null): Promise<boolean> {
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
