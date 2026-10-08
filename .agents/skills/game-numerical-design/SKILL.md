---
name: game-numerical-design
description: Framework for mathematical balancing of game economies, currency faucets vs sinks, drop rate probability, progression curves, and anti-inflation mechanics in multiplayer games.
---

# Game Numerical Design & Economy Balancing Skill

Adapted from the **Yuki001/game-dev-skills** mathematical architecture and MMO economy balancing standards. This skill guides the agent in modeling, balancing, and testing game numbers, item pricing, RNG drop curves, and sustainable economy loops.

---

## 1. Faucets & Sinks (The Macro Economy Model)

An MMO economy remains healthy only when the rate of currency creation (Faucets) is balanced by meaningful consumption channels (Sinks):

```
       [ FAUCETS ]                                       [ SINKS ]
   (Money Inflow)                                   (Money Outflow)
+------------------------+                        +-------------------------+
| - Selling caught fish  |                        | - Purchasing rods/boats |
| - Harvesting crops     | ====> [ COIN POOL ] ==>| - Upgrading warehouse   |
| - Daily contracts      |       (Player Balances)| - Buying weapons/gear   |
| - Minigame wins (Bida) |                        | - Decorating apartments |
+------------------------+                        | - Transaction taxes     |
                                                  +-------------------------+
```

### 1.1 Faucet Rules
1. **Time-Gated Production**: Currencies cannot be earned infinitely with zero cost or zero cooldown. Every faucet requires time, energy, or initial investment (e.g. buying seeds -> watering -> harvest cycle).
2. **Quality Brackets**: Base items provide baseline income; rare/giant variants provide milestone excitement without breaking total balance:
   - Small Fish: $5 - 15$ Coins
   - Medium Fish: $20 - 45$ Coins
   - Large / Rare Fish: $80 - 180$ Coins
   - Mythic / Abyssal Catch: $400 - 1,200$ Coins

### 1.2 Sink Rules
1. **Permanent Progress Sinks**: Large, non-reversible investments that feel rewarding (e.g., Warehouse capacity $+50$ slots, purchasing a Trawler boat, unlocking farm plots).
2. **Cosmetic & Prestige Sinks**: High-tier vanity items (Legendary swords, fashion hats, luxury sports cars) priced exponentially higher to absorb excess coin from veteran players.
3. **Consumable / Activity Sinks**: Small recurring costs (fertilizer, fish bait, entry stakes).

---

## 2. Pricing & Progression Curves

### 2.1 Exponential Cost Scaling
Tiered upgrades must scale exponentially to prevent players from instantly maxing out content:
$$\text{Cost}(N) = \text{BaseCost} \times (\text{Multiplier})^{N-1}$$
- *Example (Warehouse Storage Tiers)*:
  - Tier 1 (100 slots): Free (Starter)
  - Tier 2 (150 slots): $500$ Coins
  - Tier 3 (200 slots): $1,500$ Coins ($\times 3.0$)
  - Tier 4 (250 slots): $4,500$ Coins ($\times 3.0$)

### 2.2 Time-to-Earn (TTE) Pacing Benchmarks
When setting item prices, calculate the active playtime required:
- **Starter Item** (Coracle / Twig Rod): $0 - 5$ minutes of gameplay.
- **Mid-Tier Upgrade** (Sampan / Iron Rod / Iron Sword): $30 - 60$ minutes of gameplay.
- **High-Tier Asset** (Cutter / Pro Carbon Rod): $2 - 4$ hours of varied gameplay.
- **Endgame Trophy** (Trawler / Dragon Sword / Sports Car): $10 - 20$ hours of dedicated play.

---

## 3. Probability & Drop Table Architecture

### 3.1 Standard Rarity Distribution
Use normalized probability weight distributions that guarantee expected player feelings:
| Rarity | Weight | Drop Chance | Visual Accent | Expected Frequency |
|---|---|---|---|---|
| `common` | 600 | $\approx 60.0\%$ | `#94a3b8` (Slate) | Frequent baseline |
| `rare` | 260 | $\approx 26.0\%$ | `#38bdf8` (Sky) | Regular dopamine hit |
| `epic` | 100 | $\approx 10.0\%$ | `#a855f7` (Purple) | Memorable achievement |
| `legendary` | 32 | $\approx 3.2\%$ | `#f59e0b` (Amber) | Bragging right |
| `defiant` | 7 | $\approx 0.7\%$ | `#ef4444` (Rose) | Elite server milestone |
| `sovereign`| 1 | $\approx 0.1\%$ | `#38bdf8` (Cyan Glow)| Ultra-rare jackpot |

### 3.2 Pseudo-Random Distribution (Pity System)
Pure randomness can cause frustrating dry streaks. For critical drops:
- Increase the roll chance by $+P$ after every unsuccessful attempt until success occurs, then reset.
- Cap maximum attempts before guaranteed drop.

---

## 4. Verification & Testing Checklist

Always verify numerical designs with unit tests:
1. **Overflow & Integer Safety**: Ensure coins and item quantities fit within safe integer boundaries (`Number.isSafeInteger()`).
2. **Negative Delta Protection**: Test that deductions reject balance underflows (`balanceAfter >= 0`).
3. **Idempotency Guarantee**: Running the same transaction `requestId` twice must yield identical balance without double charging or double rewarding.
4. **Inflation Sanity Check**: Calculate the maximum coin generation rate per hour for an optimal player. Ensure it does not outpace designed sink progression.
