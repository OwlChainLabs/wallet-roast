# 🦉 wallet-roast

paste a solana wallet. an ai roasts your trades.

> **no private keys. ever.** wallet-roast only reads public on-chain data.
> no wallet connect, no signing, nothing to approve.

## what it does

1. loads the last ~100 trades of a public solana address (solana tracker, helius as fallback)
2. calculates realized pnl in SOL, win rate, best and worst trade, bags never sold
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

- only swaps between SOL and a token are counted
- pnl is realized only (SOL out minus SOL in per token). open bags are not counted
- the score is simple on purpose: win rate and pnl move it up or down. see `lib/pnl.ts`

## stack

next.js · solana tracker · helius · claude · vercel

## license

MIT · built in public by [@OwlChainLabs](https://x.com/OwlChainLabs)
