"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Turnstile, { passCheck } from "./Turnstile";

// shown on a roast link that is not cached yet and the visitor has no pass
export default function HumanGate() {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onToken(t: string | null) {
    if (!t) return;
    setMsg("checking…");
    if (await passCheck(t)) {
      setMsg("roasting…");
      router.refresh();
    } else setMsg("check failed. reload and try again.");
  }

  return (
    <main>
      <h1>quick check first</h1>
      <p className="sub">prove you are human and the roast starts right away.</p>
      <Turnstile onToken={onToken} />
      {msg && <p className="note">{msg}</p>}
    </main>
  );
}
