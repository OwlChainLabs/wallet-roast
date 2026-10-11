import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "wallet roast · owl chain labs",
  description: "paste a solana wallet. an ai roasts your trades. no private keys. ever.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="brand" href="https://owlchainlabs.xyz">
            <img src="/owl.svg" alt="" width={34} height={34} />
            <span className="wordmark">owlchain<span>labs</span></span>
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
