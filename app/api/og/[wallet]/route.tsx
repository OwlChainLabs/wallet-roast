import { ImageResponse } from "next/og";
import { getRoast } from "@/lib/roast";
import { isValidWallet, shortAddr } from "@/lib/validate";

export const maxDuration = 60;

type Ctx = { params: Promise<{ wallet: string }> };

// 1200x630 share card shown when a roast link is posted on X.
export async function GET(_req: Request, { params }: Ctx) {
  const { wallet } = await params;
  if (!isValidWallet(wallet)) return new Response("bad wallet", { status: 400 });

  let title = "get your wallet roasted";
  let score = 0;
  let pnl = 0;
  try {
    const r = await getRoast(wallet);
    title = r.title;
    score = r.score;
    pnl = r.stats.totalPnl;
  } catch {
    // fall back to a generic card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: 64,
          background: "linear-gradient(135deg, #0a0d1a, #1b2140)", color: "#f2f2f5",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#9aa0b8" }}>
          {`🦉 wallet roast · ${shortAddr(wallet)}`}
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#9aa0b8" }}>degen score</div>
            <div style={{ fontSize: 96, fontWeight: 800, color: score >= 7 ? "#14f195" : score >= 4 ? "#ffc857" : "#ff5c7a" }}>{`${score}/10`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 26, color: "#9aa0b8" }}>realized pnl</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: pnl >= 0 ? "#14f195" : "#ff5c7a" }}>
              {`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} SOL`}
            </div>
            <div style={{ fontSize: 24, color: "#9aa0b8", marginTop: 8 }}>@OwlChainLabs</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
