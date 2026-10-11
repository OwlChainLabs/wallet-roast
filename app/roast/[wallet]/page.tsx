import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site";
import { getRoast } from "@/lib/roast";
import { isValidWallet, shortAddr, shortHash } from "@/lib/validate";
import { money } from "@/lib/pnl";

export const maxDuration = 60;

type Props = { params: Promise<{ wallet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  const title = `wallet roast · ${shortAddr(wallet)}`;
  // a new roast gets a new image url, so x and browsers never show an old card
  let v = "0";
  try {
    v = shortHash((await getRoast(wallet)).title);
  } catch {}
  const image = `/api/og/${wallet}?v=${v}`;
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
  // the card shows this roast; the text links the start page so others can roast theirs
  const shareText = `"${title}" 💀\n\njust got my solana wallet roasted by @OwlChainLabs\n\nroast yours 👉 ${SITE_URL.replace("https://", "")}\n\n`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/roast/${wallet}?r=${shortHash(title)}`)}`;

  const scoreColor = score >= 7 ? "var(--green)" : score >= 4 ? "#ffc857" : "var(--red)";
  const verdict = score >= 8 ? "certified chad" : score >= 6 ? "actually decent" : score >= 4 ? "mid at best" : score >= 2 ? "exit liquidity" : "financially cooked";

  return (
    <main className="rp">
      <section className="rp-roast">
        <span className="addr">{shortAddr(wallet)}</span>
        <h1 className="rp-title">{title}</h1>
        <p className="rp-text">{roast}</p>
      </section>

      <aside className="rp-side">
        {!result.unreadable && (
          <>
            <div className="rp-score">
              <div>
                <div className="k">degen score</div>
                <div className="big" style={{ color: scoreColor }}>{score}<span>/10</span></div>
              </div>
              <div className="verdict" style={{ color: scoreColor, borderColor: scoreColor }}>{verdict}</div>
            </div>

            <div className="rp-grid">
              <div className="stat"><div className="k">net pnl</div><div className={`v ${stats.totalPnl >= 0 ? "pos" : "neg"}`}>{sol(stats.totalPnl)}</div></div>
              <div className="stat"><div className="k">win rate</div><div className="v">{(stats.winRate * 100).toFixed(0)}%</div></div>
              <div className="stat"><div className="k">trades</div><div className="v">{stats.trades}</div></div>
              <div className="stat"><div className="k">bags never sold</div><div className="v">{stats.bagsHeld}</div></div>
              {stats.biggestWin && (
                <div className="stat"><div className="k">best trade</div><div className="v pos">{`${stats.biggestWin.name} ${sol(stats.biggestWin.pnl)}`}</div></div>
              )}
              {stats.biggestLoss && (
                <div className="stat"><div className="k">worst trade</div><div className="v neg">{`${stats.biggestLoss.name} ${sol(stats.biggestLoss.pnl)}`}</div></div>
              )}
            </div>

            <a className="share" href={shareUrl} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              share your roast
            </a>
          </>
        )}
        <a className="again" href="/">🔥 roast your own wallet</a>
      </aside>

      <p className="rp-foot">
        {`last ${stats.trades} trades · net pnl in ${stats.unit} from on-chain balances, incl. fees · unsold coins count as lost · for fun, not financial advice · `}
        <a href="https://github.com/OwlChainLabs/wallet-roast">open source</a>
      </p>
    </main>
  );
}
