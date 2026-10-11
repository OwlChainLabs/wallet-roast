import type { Swap } from "./helius";

export type TokenResult = {
  mint: string;
  name: string;
  solIn: number; // SOL spent buying
  solOut: number; // SOL received selling
  pnl: number; // solOut - solIn (realized, SOL)
  buys: number;
  sells: number;
  holdMinutes: number | null; // first buy to last sell
  stillHolding: boolean;
};

export type WalletStats = {
  wallet: string;
  trades: number;
  tokensTraded: number;
  totalPnl: number;
  winRate: number; // share of closed positions with pnl > 0
  biggestWin: TokenResult | null;
  biggestLoss: TokenResult | null;
  fastestPaperHands: TokenResult | null; // shortest hold that closed in profit
  bagsHeld: number; // tokens bought, never sold
  avgHoldMinutes: number | null;
  firstTrade: number | null;
  lastTrade: number | null;
};

export function computeStats(
  wallet: string,
  swaps: Swap[],
  names: Record<string, string>
): WalletStats {
  const by = new Map<string, TokenResult & { firstBuy?: number; lastSell?: number; tokenNet: number }>();

  for (const s of swaps) {
    let r = by.get(s.mint);
    if (!r) {
      r = {
        mint: s.mint,
        name: names[s.mint] ?? s.mint.slice(0, 4),
        solIn: 0, solOut: 0, pnl: 0, buys: 0, sells: 0,
        holdMinutes: null, stillHolding: false, tokenNet: 0,
      };
      by.set(s.mint, r);
    }
    r.tokenNet += s.tokenDelta;
    if (s.solDelta < 0) {
      r.solIn += -s.solDelta;
      r.buys++;
      r.firstBuy = Math.min(r.firstBuy ?? s.timestamp, s.timestamp);
    } else {
      r.solOut += s.solDelta;
      r.sells++;
      r.lastSell = Math.max(r.lastSell ?? s.timestamp, s.timestamp);
    }
  }

  const results: TokenResult[] = [];
  for (const r of by.values()) {
    r.pnl = r.solOut - r.solIn;
    r.stillHolding = r.sells === 0 || r.tokenNet > 0;
    if (r.firstBuy && r.lastSell && r.lastSell >= r.firstBuy) {
      r.holdMinutes = (r.lastSell - r.firstBuy) / 60;
    }
    const { firstBuy, lastSell, tokenNet, ...clean } = r;
    void firstBuy; void lastSell; void tokenNet;
    results.push(clean);
  }

  const closed = results.filter((r) => r.buys > 0 && r.sells > 0);
  const wins = closed.filter((r) => r.pnl > 0);
  const sorted = [...closed].sort((a, b) => b.pnl - a.pnl);
  const holds = closed.map((r) => r.holdMinutes).filter((m): m is number => m !== null);
  const paper = wins
    .filter((r) => r.holdMinutes !== null)
    .sort((a, b) => (a.holdMinutes ?? 0) - (b.holdMinutes ?? 0))[0];
  const times = swaps.map((s) => s.timestamp);

  return {
    wallet,
    trades: swaps.length,
    tokensTraded: results.length,
    totalPnl: closed.reduce((sum, r) => sum + r.pnl, 0),
    winRate: closed.length ? wins.length / closed.length : 0,
    biggestWin: sorted[0] && sorted[0].pnl > 0 ? sorted[0] : null,
    biggestLoss: sorted.at(-1) && sorted.at(-1)!.pnl < 0 ? sorted.at(-1)! : null,
    fastestPaperHands: paper ?? null,
    bagsHeld: results.filter((r) => r.buys > 0 && r.sells === 0).length,
    avgHoldMinutes: holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : null,
    firstTrade: times.length ? Math.min(...times) : null,
    lastTrade: times.length ? Math.max(...times) : null,
  };
}

// 1 = disaster, 10 = god-tier. Simple and explainable on purpose.
export function degenScore(s: WalletStats): number {
  if (s.trades === 0) return 0;
  let score = 5;
  score += (s.winRate - 0.5) * 6; // win rate moves it up to ±3
  score += Math.max(-2, Math.min(2, s.totalPnl / 10)); // pnl moves it up to ±2
  if (s.bagsHeld > 10) score -= 1;
  return Math.max(1, Math.min(10, Math.round(score)));
}
