import { isValidWallet } from "@/lib/validate";

// Temporary diagnostics: how are sells represented in Solana Tracker trades?
// Public data only, no key exposed.
export const maxDuration = 30;

const SOL = "So11111111111111111111111111111111111111112";

type Ctx = { params: Promise<{ wallet: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { wallet } = await params;
  if (!isValidWallet(wallet)) return Response.json({ error: "bad wallet" }, { status: 400 });

  const res = await fetch(`https://data.solanatracker.io/wallet/${wallet}/trades`, {
    headers: { "x-api-key": process.env.SOLANATRACKER_API_KEY ?? "" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => null);
  const trades: any[] = data?.trades ?? [];

  const kinds: Record<string, number> = {};
  const programs: Record<string, number> = {};
  const otherWallet: Record<string, number> = {};
  for (const t of trades) {
    const f = t.from?.address === SOL ? "SOL" : t.from?.token?.symbol ?? "token";
    const to = t.to?.address === SOL ? "SOL" : t.to?.token?.symbol ?? "token";
    const kind = f === "SOL" ? "SOL->token" : to === "SOL" ? "token->SOL" : `${f}->${to}`;
    const k = kind.includes("->") && !kind.startsWith("SOL") && !kind.endsWith("SOL") ? "token->token" : kind;
    kinds[k] = (kinds[k] ?? 0) + 1;
    programs[t.program ?? "?"] = (programs[t.program ?? "?"] ?? 0) + 1;
    if (t.wallet && t.wallet !== wallet) otherWallet[t.wallet] = (otherWallet[t.wallet] ?? 0) + 1;
  }

  const slim = (t: any) => ({
    tx: t.tx,
    program: t.program,
    time: t.time,
    from: { address: t.from?.address, symbol: t.from?.token?.symbol, amount: t.from?.amount },
    to: { address: t.to?.address, symbol: t.to?.token?.symbol, amount: t.to?.amount },
    volume: t.volume,
  });

  return Response.json({
    status: res.status,
    count: trades.length,
    hasNextPage: data?.hasNextPage,
    kinds,
    programs,
    otherWallet,
    sellExamples: trades.filter((t) => t.from?.address !== SOL).slice(0, 4).map(slim),
    // one token from the newest trades: all its trades, to see buy and sell side by side
    oneToken: (() => {
      const mint = trades.find((t) => t.from?.address === SOL)?.to?.address;
      return trades
        .filter((t) => t.from?.address === mint || t.to?.address === mint)
        .slice(0, 6)
        .map(slim);
    })(),
  });
}
