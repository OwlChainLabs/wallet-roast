// Solana addresses are base58, 32 to 44 characters.
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidWallet(input: string): boolean {
  return BASE58.test(input.trim());
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
