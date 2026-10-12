"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

export const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

// renders the cloudflare widget and reports the token (or null when it expires)
export default function Turnstile({ onToken }: { onToken: (t: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let id: string | undefined;
    const mount = () => {
      if (!box.current || !window.turnstile || id) return false;
      id = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
      return true;
    };
    const timer = setInterval(() => mount() && clearInterval(timer), 200);
    mount();
    return () => {
      clearInterval(timer);
      if (id) window.turnstile?.remove(id);
    };
  }, []);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={box} className="ts" />
    </>
  );
}

// asks the server to check the token and set the pass cookie
export async function passCheck(token: string | null): Promise<boolean> {
  if (!SITE_KEY) return true;
  if (!token) return false;
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => null);
  return Boolean(res?.ok);
}
