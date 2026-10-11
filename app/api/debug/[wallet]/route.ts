import { isValidWallet } from "@/lib/validate";

// Temporary diagnostics: shows what Helius returns for a wallet so we can see
// why swaps are or are not detected. Only public on-chain data, no keys exposed.
export const maxDuration = 30;

type Ctx = { params: Promise<{ wallet: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { wallet } = await params;
  if (!isValidWallet(wallet)) return Response.json({ error: "bad wallet" }, { status: 400 });

  const url = new URL(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`);
  url.searchParams.set("api-key", process.env.HELIUS_API_KEY ?? "");
  url.searchParams.set("limit", "100");

  const started = Date.now();
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const ms = Date.now() - started;
  const text = await res.text();

  let txs: unknown;
  try {
    txs = JSON.parse(text);
  } catch {
    return Response.json({ status: res.status, ms, body: text.slice(0, 500) });
  }
  if (!Array.isArray(txs)) return Response.json({ status: res.status, ms, body: txs });

  const types: Record<string, number> = {};
  const sources: Record<string, number> = {};
  for (const t of txs as Array<{ type?: string; source?: string }>) {
    types[t.type ?? "?"] = (types[t.type ?? "?"] ?? 0) + 1;
    sources[t.source ?? "?"] = (sources[t.source ?? "?"] ?? 0) + 1;
  }

  // a few samples, trimmed to the parts that involve this wallet
  const samples = (txs as Array<Record<string, any>>).slice(0, 4).map((t) => ({
    type: t.type,
    source: t.source,
    time: t.timestamp ? new Date(t.timestamp * 1000).toISOString() : null,
    description: t.description,
    nativeTransfers: (t.nativeTransfers ?? []).filter(
      (n: any) => n.fromUserAccount === wallet || n.toUserAccount === wallet
    ),
    tokenTransfers: (t.tokenTransfers ?? []).filter(
      (n: any) => n.fromUserAccount === wallet || n.toUserAccount === wallet
    ),
    accountDataForWallet: (t.accountData ?? []).find((a: any) => a.account === wallet) ?? null,
    hasSwapEvent: !!t.events?.swap,
  }));

  return Response.json({ status: res.status, ms, count: txs.length, types, sources, samples });
}
