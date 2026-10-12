"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidWallet } from "@/lib/validate";

// made-up examples, not real wallets
const EXAMPLES = [
  { addr: "7xKp…9fQa", score: "2/10", text: "41 dog coins this month. the only thing that went up was your screen time.", tags: ["serial aper", "night trader"] },
  { addr: "3mQz…Lp2X", score: "1/10", text: "you held a coin down 97% for half a year. that is not conviction, that is a hostage situation.", tags: ["bagholder", "copium addict"], hot: true },
  { addr: "9aRt…Ve4M", score: "4/10", text: "you sold right before the pump. twice. the chart should pay you to leave.", tags: ["paper hands", "exit liquidity"] },
];

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
    <main className="landing">
      <section className="hero">
        <span className="pill">OPEN SOURCE · SOLANA · NO LOGIN</span>
        <h1>
          your wallet has
          <br />
          <span>some explaining to do.</span>
        </h1>
        <p className="sub">
          paste any solana wallet. our ai reads every trade, every rug and every 3am ape, then roasts you for it.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="wallet" style={{ position: "absolute", left: -9999 }}>
            solana wallet address
          </label>
          <input
            id="wallet"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="paste a solana wallet address…"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? "roasting…" : "roast me"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="note">read only. no connect, no signing, no private keys. ever.</p>
      </section>

      <section className="examples" aria-label="example roasts">
        {EXAMPLES.map((ex) => (
          <article key={ex.addr} className={ex.hot ? "ex hot" : "ex"}>
            <div className="meta">
              <span>{ex.addr}</span>
              <b>degen score {ex.score}</b>
            </div>
            <q>{ex.text}</q>
            <div className="tags">
              {ex.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="how">
        <h2>three steps to humiliation</h2>
        <div className="steps">
          <div>
            <i>01</i>
            <h3>paste a wallet</h3>
            <p>yours, your friend&apos;s or a famous whale. only public on-chain data is read.</p>
          </div>
          <div>
            <i>02</i>
            <h3>ai digs through the trades</h3>
            <p>wins, losses, rugs and panic sells become a personal roast in seconds.</p>
          </div>
          <div>
            <i>03</i>
            <h3>share the damage</h3>
            <p>every roast becomes a card made for x. tag the wallet owner if you dare.</p>
          </div>
        </div>
      </section>

      <p className="foot">
        <span>
          open source · <a href="https://github.com/OwlChainLabs/wallet-roast">github</a> · built by{" "}
          <a href="https://x.com/OwlChainLabs">@OwlChainLabs</a>
        </span>
        <span>for entertainment only. not financial advice.</span>
      </p>
    </main>
  );
}
