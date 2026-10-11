"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidWallet } from "@/lib/validate";

export default function Home() {
  const router = useRouter();
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = wallet.trim();
    if (!isValidWallet(w)) {
      setError("that does not look like a solana address.");
      return;
    }
    setError("");
    setLoading(true);
    router.push(`/roast/${w}`);
  }

  return (
    <main>
      <h1>🦉 wallet roast</h1>
      <div className="bar" />
      <p className="sub">
        paste any solana wallet. our ai looks at the trades and roasts them.
        <br />
        public address only. no connect, no signing, no private keys. ever.
      </p>

      <form onSubmit={submit}>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="solana wallet address"
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>
          {loading ? "roasting…" : "roast it"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <p className="foot">
        open source ·{" "}
        <a href="https://github.com/OwlChainLabs/wallet-roast">github</a> · built by{" "}
        <a href="https://x.com/OwlChainLabs">@OwlChainLabs</a>
      </p>
    </main>
  );
}
