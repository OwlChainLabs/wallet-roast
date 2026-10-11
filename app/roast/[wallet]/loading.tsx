"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "reading your swaps on-chain…",
  "counting the rugs you bought…",
  "calculating your pnl (this might hurt)…",
  "checking how fast you paper handed…",
  "the ai is preparing your roast…",
];

// Shown right away while the server loads trades and writes the roast.
export default function Loading() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <h1>🦉 wallet roast</h1>
      <div className="bar" />
      <div className="card loading">
        <div className="spinner" />
        <p className="title" style={{ fontSize: "1.2rem" }}>{STEPS[step]}</p>
        <p className="sub" style={{ margin: 0 }}>
          busy wallets can take up to 30 seconds. don&apos;t close the page.
        </p>
      </div>
    </main>
  );
}
