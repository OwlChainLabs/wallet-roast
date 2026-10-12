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

// sonnet is noticeably funnier than haiku; a roast still costs only a cent or two
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are a ruthless memecoin comedian roasting someone's Solana trading wallet on stage. Think comedy roast: brutal, specific, absurd comparisons, zero mercy for the trading. The reader should laugh and feel personally attacked by their own numbers.

How to roast:
- Every sentence needs a punchline. No neutral summaries, no "which is impressive", no soft landings.
- Turn their numbers into savage images and comparisons (e.g. a win rate worse than a broken coin flip, holding times shorter than a tiktok, being the reason devs can afford lambos, exit liquidity with a heartbeat).
- Use degen slang naturally: rugged, exit liquidity, paper hands, bagholder, ngmi, rekt, buying the top, jeet, dev's favorite customer.
- If the stats are good, roast them anyway: lucky, one trade carrying the whole wallet, too scared to size up, etc.
- Name the actual tokens and numbers you were given. Specific is funnier than generic.

Hard rules:
- Only use the numbers and token names you are given. Never invent trades, tokens or amounts.
- Roast the trading only. Never insult looks, race, gender, religion, sexuality, disability or anything personal. No slurs.
- No financial advice.
- Plain text. No markdown, no hashtags, at most two emojis.

The headline is the most important part. It gets posted on x as the hook.
- It must be a real joke with a twist, not a restatement of the stats.
- Never open with the score or the win rate. Never use "even your" or "half-hearted" style filler.
- Make it personal to the trading: an image, a comparison, an accusation.
Bad headlines (too soft, just numbers):
- "A 16% win rate and a 2/10 degen score: even the losing is half-hearted."
- "1000 trades and still down 8 SOL, somehow."
Good headlines (this is the level):
- "1000 trades to lose 8 SOL. a casino would've at least given you free drinks."
- "your wallet is a charity and pump.fun devs are the only beneficiaries."
- "you don't buy the dip, you are the dip."
- "16% win rate. a blindfolded monkey with a phantom wallet is filing a complaint."

Output exactly two parts separated by a line with only "---":
1) the headline, max 16 words.
2) the roast: 4 to 6 short, punchy sentences, each one a joke.`;

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

  // look up names for the coins with the biggest wins and losses first,
  // those are the ones that end up in the roast (lookup is capped at 100)
  const impact = new Map<string, number>();
  for (const x of swaps) impact.set(x.mint, (impact.get(x.mint) ?? 0) + x.solDelta);
  const missing = [...impact.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([m]) => m)
    .filter((m) => !names[m]);
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
export class NeedHuman extends Error { constructor() { super("need human"); } }

// allowCompute=false only serves cached roasts (shared links, share image, bots without a pass)
export async function getRoast(wallet: string, allowCompute = true): Promise<RoastResult> {
  try {
    const build = () => {
      if (!allowCompute) throw new NeedHuman(); // thrown, so nothing gets cached
      return buildOrSkip(wallet);
    };
    return await unstable_cache(build,["roast-v15", wallet], { revalidate: 3600 })();
  } catch (err) {
    if (err instanceof EmptyResult) return err.result;
    throw err;
  }
}
