# 🦉 wallet-roast

paste a solana wallet. an ai roasts your trades.

**try it: [roast.owlchainlabs.xyz](https://roast.owlchainlabs.xyz)**

![wallet-roast demo](./docs/demo.gif)

> **no private keys. ever.** wallet-roast only reads public on-chain data.
> no wallet connect, no signing, nothing to approve.

## what it does

1. loads the last ~1000 trades of a public solana address, straight from on-chain balance changes (helius)
2. calculates net pnl, win rate, best and worst trade, bags never sold
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
- a free api key from [helius.dev](https://helius.dev) (trade history)
- an api key from [console.anthropic.com](https://console.anthropic.com) (the roast)
- optional: a free api key from [solanatracker.io](https://solanatracker.io) (fallback)
- optional: `NEXT_PUBLIC_SITE_URL` if you host it on your own domain (used in share links)

## how the numbers work

- only transactions the wallet paid for itself and where tokens actually moved in or out. works with any terminal (axiom, padre, photon, ...) and ignores other people's trades on a dev wallet
- last ~1000 trades, pnl in SOL
- solana tracker is only used as a fallback when helius finds almost nothing
- net pnl = SOL out minus SOL in per token, from real on-chain balance changes (fees and tips included). coins never sold count as lost (memecoin reality)
- the score is simple on purpose: win rate and pnl move it up or down. see `lib/pnl.ts`

## stack

next.js · helius · solana tracker · claude · vercel

## license

MIT · built in public by [@OwlChainLabs](https://x.com/OwlChainLabs)
