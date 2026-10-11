import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wallet roast · owl chain labs",
  description: "paste a solana wallet. an ai roasts your trades. no private keys. ever.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
