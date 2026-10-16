import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "wallet roast · owl chain labs",
  description: "paste a solana wallet. an ai roasts your trades. no private keys. ever.",
};

// fixed, well-spread stars so server and client render the same (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const STARS = Array.from({ length: 70 }, () => ({
  left: rand() * 100, top: rand() * 100, dur: 2 + rand() * 4, delay: rand() * 4, big: rand() > 0.8,
}));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <div className="sky" aria-hidden="true">
          <div className="glow a" />
          <div className="glow b" />
          {STARS.map((st, i) => (
            <div
              key={i}
              className={st.big ? "star big" : "star"}
              style={{ left: `${st.left}%`, top: `${st.top}%`, animationDuration: `${st.dur}s`, animationDelay: `${st.delay}s` }}
            />
          ))}
        </div>
        <header className="topbar">
          <a className="brand" href="https://owlchainlabs.xyz">
            <img src="/owl.svg" alt="" width={34} height={34} />
            <span className="wordmark">owlchain<span>labs</span></span>
          </a>
          <nav className="social">
            <a href="https://x.com/OwlChainLabs" target="_blank" rel="noopener" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              <span>@OwlChainLabs</span>
            </a>
            <a href="https://github.com/OwlChainLabs/wallet-roast" target="_blank" rel="noopener" aria-label="GitHub">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" /></svg>
              <span>GitHub</span>
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
