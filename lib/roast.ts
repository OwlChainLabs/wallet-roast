import { unstable_cache } from "next/cache";
import { fetchSwaps, fetchTokenNames } from "./helius";
import { computeStats, degenScore, type WalletStats } from "./pnl";

export type RoastResult = {
  stats: WalletStats;
  score: number;
  title: string; // short punchline for the share card
  roast: string; // the full roast
};

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

const SYSTEM = `You roast Solana memecoin wallets. Funny, sharp, degen slang, like a friend who has seen too many rugs.
Rules:
- Only use the numbers you are given. Never invent trades, tokens or amounts.
- Roast the trading, never the person. No slurs, no insults about looks, race, gender, religion or anything personal.
- No financial advice.
- Plain text. No markdown, no hashtags, no emojis except at most two.
Output exactly two parts separated by a line with only "---":
1) a punchline title, max 8 words
2) the roast, 4 to 6 short sentences`;

function fmt(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)} SOL`;
}

function describe(s: WalletStats, score: number): string {
  const lines = [
    `swaps: ${s.trades}`,
    `tokens traded: ${s.tokensTraded}`,
    `realized pnl: ${fmt(s.totalPnl)}`,
    `win rate: ${(s.winRate * 100).toFixed(0)}%`,
    `bags never sold: ${s.bagsHeld}`,
    `degen score: ${score}/10`,
  ];
  if (s.biggestWin) lines.push(`biggest win: ${s.biggestWin.name} ${fmt(s.biggestWin.pnl)}`);
  if (s.biggestLoss) lines.push(`biggest loss: ${s.biggestLoss.name} ${fmt(s.biggestLoss.pnl)}`);
  if (s.fastestPaperHands?.holdMinutes != null)
    lines.push(`fastest profitable exit: ${s.fastestPaperHands.name} after ${s.fastestPaperHands.holdMinutes.toFixed(0)} min`);
  if (s.avgHoldMinutes != null) lines.push(`average hold: ${s.avgHoldMinutes.toFixed(0)} min`);
  return lines.join("\n");
}

async function askClaude(facts: string): Promise<{ title: string; roast: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: `Roast this wallet:\n${facts}` }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`anthropic error ${res.status}`);
  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();

  const [title, ...rest] = text.split(/\n-{3,}\n/);
  return {
    title: (title ?? "").trim().replace(/^["']|["']$/g, ""),
    roast: rest.join("\n").trim() || text,
  };
}

async function buildRoast(wallet: string): Promise<RoastResult> {
  const swaps = await fetchSwaps(wallet);
  const mints = [...new Set(swaps.map((s) => s.mint))];
  const names = await fetchTokenNames(mints);
  const stats = computeStats(wallet, swaps, names);
  const score = degenScore(stats);

  if (stats.trades === 0) {
    return {
      stats,
      score,
      title: "No swaps found. Suspiciously clean.",
      roast:
        "We went through your latest transactions and found zero SOL swaps. Either you are a genius who never touched a memecoin, you trade through a bot we can not read yet, or you are just scared. Honestly, all three beat most wallets we roast.",
    };
  }

  const { title, roast } = await askClaude(describe(stats, score));
  return { stats, score, title, roast };
}

// Results with zero swaps are not cached (could be a temporary data issue).
class EmptyResult extends Error {
  constructor(public result: RoastResult) {
    super("empty");
  }
}

async function buildOrSkip(wallet: string): Promise<RoastResult> {
  const r = await buildRoast(wallet);
  if (r.stats.trades === 0) throw new EmptyResult(r); // errors are never cached
  return r;
}

// Cache per wallet for 1 hour so the page and the share image reuse one result
// and the same wallet does not cost API calls again and again.
export async function getRoast(wallet: string): Promise<RoastResult> {
  try {
    return await unstable_cache(() => buildOrSkip(wallet), ["roast-v2", wallet], { revalidate: 3600 })();
  } catch (err) {
    if (err instanceof EmptyResult) return err.result;
    throw err;
  }
}
