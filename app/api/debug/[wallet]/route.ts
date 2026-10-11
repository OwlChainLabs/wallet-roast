import { isValidWallet } from "@/lib/validate";

// Temporary diagnostics: raw sample of Solana Tracker trades for a wallet,
// to check how buys and sells are represented. Public data only, no key exposed.
export const maxDuration = 30;

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

  // count which addresses show up on each side, to spot how SOL is encoded
  const fromCount: Record<string, number> = {};
  const toCount: Record<string, number> = {};
  for (const t of trades) {
    const f = `${t.from?.token?.symbol ?? "?"} ${t.from?.address ?? "?"}`;
    const to = `${t.to?.token?.symbol ?? "?"} ${t.to?.address ?? "?"}`;
    fromCount[f] = (fromCount[f] ?? 0) + 1;
    toCount[to] = (toCount[to] ?? 0) + 1;
  }
  const top = (m: Record<string, number>) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return Response.json({
    status: res.status,
    count: trades.length,
    keys: trades[0] ? Object.keys(trades[0]) : [],
    topFrom: top(fromCount),
    topTo: top(toCount),
    samples: trades.slice(0, 3).map((t) => ({
      ...t,
      from: { ...t.from, token: { symbol: t.from?.token?.symbol, name: t.from?.token?.name } },
      to: { ...t.to, token: { symbol: t.to?.token?.symbol, name: t.to?.token?.name } },
    })),
  });
}
