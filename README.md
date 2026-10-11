# 🦉 wallet-roast

paste a solana wallet. an ai roasts your trades.

> **no private keys. ever.** wallet-roast only reads public on-chain data.
> no wallet connect, no signing, nothing to approve.

## what it does

1. loads the full trading pnl of a public solana address (solana tracker, helius as fallback)
2. calculates realized pnl, win rate, best and worst trade, bags never sold
3. gives a degen score from 1 to 10
4. an ai writes a roast based only on those numbers
5. makes a share card for x

## run it yourself

```bash
git clone https://github.com/OwlChainLabs/wallet-roast
cd wallet-roast
cp .env.example .env.local   # add your keys
npm install
npm run dev
```

you need:
- a free api key from [solanatracker.io](https://solanatracker.io) (trade history)
- a free api key from [helius.dev](https://helius.dev) (fallback)
- an api key from [console.anthropic.com](https://console.anthropic.com)

## how the numbers work

- with solana tracker: full history, realized pnl per token in USD
- helius fallback: last ~100 SOL swaps, realized pnl in SOL
- open bags are not counted in pnl
- the score is simple on purpose: win rate and pnl move it up or down. see `lib/pnl.ts`

## stack

next.js · solana tracker · helius · claude · vercel

## license

MIT · built in public by [@OwlChainLabs](https://x.com/OwlChainLabs)
