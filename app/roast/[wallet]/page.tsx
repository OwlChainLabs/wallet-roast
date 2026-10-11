import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoast } from "@/lib/roast";
import { isValidWallet, shortAddr } from "@/lib/validate";
import { money } from "@/lib/pnl";

export const maxDuration = 60;

type Props = { params: Promise<{ wallet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  const title = `wallet roast · ${shortAddr(wallet)}`;
  const image = `/api/og/${wallet}`;
  return {
    title,
    openGraph: { title, images: [image] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function RoastPage({ params }: Props) {
  const { wallet } = await params;
  if (!isValidWallet(wallet)) notFound();

  let result;
  try {
    result = await getRoast(wallet);
  } catch (err) {
    console.error("roast failed", wallet, err);
    return (
      <main>
        <h1>🦉 wallet roast</h1>
        <p className="error">something broke while reading this wallet. try again in a minute.</p>
        <a className="btn ghost" href="/">back</a>
      </main>
    );
  }

  const { stats, score, title, roast } = result;
  const sol = (n: number) => money(n, stats.unit);
  const host = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  const site = host;
  const shareText = `my solana wallet just got roasted: "${title}" 💀\n\ndegen score ${score}/10\n\nget roasted by @OwlChainLabs`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${site}/roast/${wallet}`)}`;

  return (
    <main>
      <a href="/" style={{ textDecoration: "none" }}>← roast another</a>

      <div className="card">
        <p className="sub" style={{ margin: 0 }}>{shortAddr(wallet)}</p>
        <p className="title">{title}</p>
        <p className="roast">{roast}</p>
      </div>

      {result.unreadable ? (
        <div className="actions">
          <a className="btn ghost" href="/">roast another</a>
        </div>
      ) : (
      <>

      <div className="card">
        <div className="grid">
          <div className="stat">
            <div className="k">degen score</div>
            <div className="score" style={{ color: score >= 7 ? "var(--green)" : score >= 4 ? "#ffc857" : "var(--red)" }}>{score}/10</div>
          </div>
          <div className="stat">
            <div className="k">net pnl</div>
            <div className={`v ${stats.totalPnl >= 0 ? "pos" : "neg"}`}>{sol(stats.totalPnl)}</div>
          </div>
          <div className="stat">
            <div className="k">win rate</div>
            <div className="v">{(stats.winRate * 100).toFixed(0)}%</div>
          </div>
          <div className="stat">
            <div className="k">trades</div>
            <div className="v">{stats.trades}</div>
          </div>
          {stats.biggestWin && (
            <div className="stat">
              <div className="k">best trade</div>
              <div className="v pos">{`${stats.biggestWin.name} ${sol(stats.biggestWin.pnl)}`}</div>
            </div>
          )}
          {stats.biggestLoss && (
            <div className="stat">
              <div className="k">worst trade</div>
              <div className="v neg">{`${stats.biggestLoss.name} ${sol(stats.biggestLoss.pnl)}`}</div>
            </div>
          )}
          <div className="stat">
            <div className="k">bags never sold</div>
            <div className="v">{stats.bagsHeld}</div>
          </div>
        </div>
      </div>

      <div className="actions">
        <a className="btn" href={shareUrl} target="_blank" rel="noopener noreferrer">share on x</a>
        <a className="btn ghost" href="/">roast another</a>
      </div>
      </>
      )}

      <p className="foot">
        {`based on the last ${stats.trades} trades. net pnl in ${stats.unit} from on-chain balances, incl. fees and tips. coins never sold count as lost.`} for fun, not financial advice.
        <br />
        open source · <a href="https://github.com/OwlChainLabs/wallet-roast">github</a>
      </p>
    </main>
  );
}
