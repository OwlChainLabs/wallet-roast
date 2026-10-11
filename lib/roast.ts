import { unstable_cache } from "next/cache";
import { fetchSwaps, fetchTokenNames, type Swap } from "./helius";
import { fetchOwnTrades } from "./helius-gtfa";
import { fetchTradesST, hasSolanaTrackerKey } from "./solanatracker";
import { computeStats, degenScore, money, type WalletStats } from "./pnl";

export type RoastResult = {
  source: string; // which data source produced the trades
  unreadable?: boolean; // data looked implausible, no roast shown
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

function describe(s: WalletStats, score: number): string {
  const fmt = (n: number) => money(n, s.unit);
  const lines = [
    `trades: ${s.trades}`,
    `tokens traded: ${s.tokensTraded}`,
    `net pnl (unsold bags counted as lost): ${fmt(s.totalPnl)}`,
    `win rate: ${(s.winRate * 100).toFixed(0)}%`,
    `bags never sold (mostly dead coins): ${s.bagsHeld}`,
    `degen score: ${score}/10`,
  ];
  if (s.biggestWin) lines.push(`biggest win: ${s.biggestWin.name} ${fmt(s.biggestWin.pnl)}`);
  if (s.biggestLoss) lines.push(`biggest loss: ${s.biggestLoss.name} ${fmt(s.biggestLoss.pnl)}`);
  if (s.fastestPaperHands?.holdMinutes != null)
    lines.push(`fastest profitable exit: ${s.fastestPaperHands.name} after ${s.fastestPaperHands.holdMinutes.toFixed(0)} min`);
  if (s.avgHoldMinutes != null) lines.push(`average hold: ${s.avgHoldMinutes.toFixed(0)} min`);
  if (s.avgBuy != null) lines.push(`average buy size: ${money(s.avgBuy, s.unit).replace("+", "")}`);
  if (s.buyOnly)
    lines.push(
      "pattern: only buys, zero sells, many tiny repeated buys. looks like a bot, a copy trader, or someone who sells from a different wallet. roast that, but do not claim it as fact."
    );
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
      max_tokens: 2000,
      // haiku 5.5 thinks adaptively by default; a short roast needs little of it
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Roast this wallet:\n${facts}` }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch((err) => {
    console.error("claude timeout or network error", err?.name);
    throw err;
  });
  if (!res.ok) {
    console.error("claude error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new Error(`anthropic error ${res.status}`);
  }
  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();

  if (!text) {
    console.error("claude returned no text", JSON.stringify(data).slice(0, 300));
    throw new Error("empty roast");
  }

  // expected: title, a line of dashes, roast. be lenient if the model drifts.
  const parts = text.split(/^\s*-{3,}\s*$/m).map((p) => p.trim()).filter(Boolean);
  let title = parts[0] ?? "";
  let roast = parts.slice(1).join("\n").trim();
  if (!roast) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    title = lines[0] ?? "";
    roast = lines.slice(1).join(" ");
  }
  return {
    title: title.replace(/^(title:|1\)|\*+)\s*/i, "").replace(/^["']|["']$/g, "").trim(),
    roast: roast.replace(/^(roast:|2\))\s*/i, "").trim() || text,
  };
}

async function buildRoast(wallet: string): Promise<RoastResult> {
  let names: Record<string, string>;
  let stats: WalletStats;
  const started = Date.now();
  names = {};
  let swaps: Swap[] = [];
  let source = "none";

  if (process.env.HELIUS_API_KEY) {
    try {
      source = "helius-gtfa";
      // primary: only transactions where tokens moved in/out of this wallet,
      // with real balance changes. works for dev wallets and any terminal.
      swaps = await fetchOwnTrades(wallet);
    } catch (err) {
      console.error("gtfa failed, using enhanced transactions", wallet, err);
      source = "helius-enhanced";
      swaps = await fetchSwaps(wallet).catch((e) => {
        console.error("helius failed", wallet, e);
        return [] as Swap[];
      });
    }
  }

  if (swaps.length < 5 && hasSolanaTrackerKey() && Date.now() - started < 20_000) {
    console.error(`helius found ${swaps.length} swaps, trying solana tracker`, wallet);
    const st = await fetchTradesST(wallet, 1000).catch(() => ({ swaps: [] as Swap[], names: {} }));
    const stSells = st.swaps.filter((x) => x.tokenDelta < 0).length;
    if (st.swaps.length > swaps.length && stSells > 0) {
      swaps = st.swaps;
      names = st.names;
      source = "solanatracker";
    }
  }

  const missing = [...new Set(swaps.map((x) => x.mint))].filter((m) => !names[m]);
  if (missing.length && process.env.HELIUS_API_KEY) Object.assign(names, await fetchTokenNames(missing));
  stats = computeStats(wallet, swaps, names);
  const buys = swaps.filter((x) => x.tokenDelta > 0).length;
  console.log(`roast data ${wallet}: source=${source} swaps=${swaps.length} buys=${buys} sells=${swaps.length - buys}`);

  const score = degenScore(stats);

  // many buys and zero sells is almost never real: we are missing the sells.
  // better to say so than to roast someone with made-up numbers.
  if (stats.buyOnly) {
    return {
      source,
      unreadable: true,
      stats,
      score,
      title: "We can't read this wallet properly yet",
      roast:
        "We only see buys and no sells for this wallet, which almost always means our data is incomplete, not that you never sell. We'd rather show nothing than roast you with wrong numbers. This happens with some dev wallets. We're working on it.",
    };
  }

  if (stats.trades === 0) {
    return {
      source,
      stats,
      score,
      title: "No trades found. Suspiciously clean.",
      roast:
        "We went through your latest transactions and found zero trades. Either you are a genius who never touched a memecoin, you trade through a bot we can not read yet, or you are just scared. Honestly, all three beat most wallets we roast.",
    };
  }

  const { title, roast } = await askClaude(describe(stats, score));
  return { source, stats, score, title, roast };
}

// Results with zero swaps are not cached (could be a temporary data issue).
class EmptyResult extends Error {
  constructor(public result: RoastResult) {
    super("empty");
  }
}

async function buildOrSkip(wallet: string): Promise<RoastResult> {
  const r = await buildRoast(wallet);
  if (r.stats.trades === 0 || r.unreadable) throw new EmptyResult(r); // errors are never cached
  return r;
}

// Cache per wallet for 1 hour so the page and the share image reuse one result
// and the same wallet does not cost API calls again and again.
export async function getRoast(wallet: string): Promise<RoastResult> {
  try {
    return await unstable_cache(() => buildOrSkip(wallet), ["roast-v11", wallet], { revalidate: 3600 })();
  } catch (err) {
    if (err instanceof EmptyResult) return err.result;
    throw err;
  }
}
