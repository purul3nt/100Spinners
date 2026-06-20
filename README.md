# 1000 Shogun Spinners

Phaser slot game built from the Baboon Bonanza project scaffold.

## Commands

```bash
npm install
npm run test
npm run test:math
npm run dev
```

## Current Scope

- 4x5 board.
- 14 attached paylines, evaluated left-to-right.
- Rebalanced local math module in `src/shogunSpinnersMath.ts`.
- Cheapest bonus buy only at `10x` bet.
- Placeholder symbols with visibly distinct shapes and colors.

## Notes

The current math is a v1 playable tuning pass, not a certified PAR. Use larger simulations before locking RTP, hit frequency, max-win frequency, or bonus-buy return.
