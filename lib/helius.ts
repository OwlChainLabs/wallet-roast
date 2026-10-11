// Reads public swap history for a wallet via the Helius Enhanced Transactions API.
// Only the public address is used. No keys, no signing.

const SOL_MINT = "So11111111111111111111111111111111111111112";

export type Swap = {
  signature: string;
  timestamp: number; // unix seconds
  mint: string; // the non-SOL token
  solDelta: number; // SOL received (+) or spent (-) by the wallet
  tokenDelta: number; // token received (+) or sent (-)
};

type TokenTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint: string;
  tokenAmount: number;
};

type NativeTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount: number; // lamports
};

type EnhancedTx = {
  signature: string;
  timestamp: number;
  type: string;
  tokenTransfers?: TokenTransfer[];
  nativeTransfers?: NativeTransfer[];
};

function key(): string {
  const k = process.env.HELIUS_API_KEY;
  if (!k) throw new Error("HELIUS_API_KEY is not set");
  return k;
}

// Turn one parsed transaction into a single "wallet swapped SOL <-> token" record.
// Wrapped SOL and native SOL are treated as the same thing.
function toSwap(tx: EnhancedTx, wallet: string): Swap | null {
  let sol = 0;
  const tokens = new Map<string, number>();

  for (const n of tx.nativeTransfers ?? []) {
    if (n.toUserAccount === wallet) sol += n.amount / 1e9;
    if (n.fromUserAccount === wallet) sol -= n.amount / 1e9;
  }
  for (const t of tx.tokenTransfers ?? []) {
    const amt = t.tokenAmount ?? 0;
    if (t.mint === SOL_MINT) {
      if (t.toUserAccount === wallet) sol += amt;
      if (t.fromUserAccount === wallet) sol -= amt;
      continue;
    }
    if (t.toUserAccount === wallet) tokens.set(t.mint, (tokens.get(t.mint) ?? 0) + amt);
    if (t.fromUserAccount === wallet) tokens.set(t.mint, (tokens.get(t.mint) ?? 0) - amt);
  }

  // keep the token with the biggest move, ignore dust
  let best: [string, number] | null = null;
  for (const [mint, d] of tokens) {
    if (d === 0) continue;
    if (!best || Math.abs(d) > Math.abs(best[1])) best = [mint, d];
  }
  if (!best || Math.abs(sol) < 1e-6) return null;
  // a real swap moves SOL and token in opposite directions
  if (Math.sign(sol) === Math.sign(best[1])) return null;

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    mint: best[0],
    solDelta: sol,
    tokenDelta: best[1],
  };
}

// Fetch up to `maxPages` pages (100 tx each) of SWAP transactions.
export async function fetchSwaps(wallet: string, maxPages = 5): Promise<Swap[]> {
  const swaps: Swap[] = [];
  let before: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`);
    url.searchParams.set("api-key", key());
    url.searchParams.set("type", "SWAP");
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`helius error ${res.status}`);
    const txs = (await res.json()) as EnhancedTx[];
    if (!Array.isArray(txs) || txs.length === 0) break;

    for (const tx of txs) {
      const s = toSwap(tx, wallet);
      if (s) swaps.push(s);
    }
    before = txs[txs.length - 1].signature;
    if (txs.length < 100) break;
  }
  return swaps;
}

// Look up token names/symbols for a list of mints (Helius DAS).
export async function fetchTokenNames(mints: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (mints.length === 0) return out;

  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "names",
      method: "getAssetBatch",
      params: { ids: mints.slice(0, 100) },
    }),
    cache: "no-store",
  });
  if (!res.ok) return out;
  const data = await res.json();
  for (const a of data?.result ?? []) {
    if (!a?.id) continue;
    const sym = a?.content?.metadata?.symbol || a?.token_info?.symbol;
    const name = a?.content?.metadata?.name;
    out[a.id] = sym ? `$${sym}` : name || a.id.slice(0, 4);
  }
  return out;
}
