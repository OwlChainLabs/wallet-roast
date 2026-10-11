"use client";

// Friendly fallback instead of the default "Application error" screen.
export default function RoastError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1>🦉 wallet roast</h1>
      <div className="bar" />
      <p className="error">
        this wallet took too long or something broke. very active wallets are hard to read.
      </p>
      <div className="actions">
        <button onClick={() => reset()}>try again</button>
        <a className="btn ghost" href="/">roast another</a>
      </div>
    </main>
  );
}
