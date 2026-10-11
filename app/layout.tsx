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
        <a className="home" href="https://owlchainlabs.xyz">
          <span>←</span> owlchain<b>labs</b>
        </a>
        {children}
      </body>
    </html>
  );
}
