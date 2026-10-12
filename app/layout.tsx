import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "wallet roast · owl chain labs",
  description: "paste a solana wallet. an ai roasts your trades. no private keys. ever.",
};

// fixed pseudo-random stars so server and client render the same
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1;
  return { left: r(1) * 100, top: r(2) * 100, dur: 2 + r(3) * 4, delay: r(4) * 4, big: r(5) > 0.8 };
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap"
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
          <a className="topnav" href="https://github.com/OwlChainLabs/wallet-roast">github</a>
        </header>
        {children}
      </body>
    </html>
  );
}
