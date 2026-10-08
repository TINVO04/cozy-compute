---
name: game-design-system
description: Framework for authoring Game Design Documents (GDD), defining core gameplay loops, tuning knobs, state machines, and system interactions for 2D games and MMOs.
---

# Game Design System & GDD Framework Skill

Adapted from the industry-standard **Claude-Code-Game-Studios (CCGS)** design framework (25,000+ ⭐). This skill guides the agent in systematically designing, documenting, and balancing gameplay features, mechanics, and progression systems before and during implementation.

---

## 1. Core Principles of Systemic Game Design

1. **Data-Driven Gameplay (The Tuning Knobs Rule)**:
   - Gameplay values (health, speed, damage, cooldowns, price, drop rates) must **never** be hardcoded inside procedural code or scene rendering logic.
   - Every mechanic must expose a typed, isolated configuration object (`*Config`) with documented tuning knobs.
   - *Example in this project*: `FISHING_RODS`, `BOATS`, `SWORDS`, `CROPS`, `LIVESTOCK` located in `packages/game-data`.

2. **The 3-Tier Gameplay Loop**:
   - **Moment-to-Moment (Seconds)**: Moving, swinging a sword, casting a fishing rod, petting a cat, picking up items. Immediate sensory feedback (audio + visual tweens + screen shake or particles).
   - **Session Loop (Minutes)**: Completing a fishing trip, harvesting crops, delivering orders, competing in a billiards match, clearing a cave level. Inventory management and coin reward.
   - **Metagame / Progression (Days/Weeks)**: Upgrading tools (wooden -> iron -> crystal), expanding farm silos, buying rare boats/vehicles, decorating personal apartments, climbing leaderboards.

3. **Zero-Dead-Ends Policy**:
   - Every interactive object or UI button must have a clear purpose, state, and feedback.
   - If an action cannot be performed (e.g. no boat equipped, broke, inventory full), provide friendly in-world toasts and direct paths forward (e.g. "Ghé Tiệm Bác Ba mua thuyền nhé!" + open shop button).

---

## 2. Standard Game Design Document (GDD) Template

When designing any new system or major feature, structure the design according to this standard:

```markdown
# [Feature Name] Game Design Document

## 1. Summary & Player Fantasy
- **Elevator Pitch**: 1-2 sentence core appeal.
- **Player Fantasy**: What does the player feel while engaging with this mechanic?
- **Target Audience / Mood**: Cozy, competitive, social, reflective.

## 2. Core Mechanics & State Machine
- **Trigger**: How does the player initiate this? (Keyboard key, proximity trigger, UI button).
- **States**:
  - `IDLE` -> `PREPARING` -> `ACTIVE` -> `COOLDOWN` -> `RESOLVED` / `CANCELLED`
- **Rules & Constraints**: What prevents actions? What happens on disconnect/interrupt?

## 3. Data Schema & Tuning Knobs
- **Config Table**:
  | Parameter | Type | Default | Tuning Purpose |
  |-----------|------|---------|----------------|
  | `baseSpeed` | number | 120 | Controls movement tempo |
  | `coinCost` | integer | 500 | Economy sink pacing |
- **Formulas**: Explicit mathematical curves (e.g. `Damage = Base * (1 + Level * 0.15)`).

## 4. Audio-Visual & Game Feel (Juice)
- **Visual Cues**: Floating icons, tween squash/stretch, particle bursts, depth sort.
- **Audio Cues**: Action sound (`pop`, `swing`, `reeling`), success fanfare, cancel chime.
- **Accessibility**: Keyboard shortcuts, reduced motion fallbacks.

## 5. Economy & Network Authority (MMO)
- **Authority**: Which server service verifies this? (Never client-authoritative).
- **Idempotency**: What key ensures no double-spending or duplicate rewards?
- **Faucets & Sinks**: How much coin/fame enters vs exits the economy?

## 6. Edge Cases & Acceptance Criteria
- [ ] What if player closes tab midway?
- [ ] What if inventory/silo is full?
- [ ] What if two players interact simultaneously?
```

---

## 3. Feature Deconstruction Workflow

Before writing code for complex mechanics:
1. **Brainstorm & Scope**: Outline minimal viable experience (MVP) vs nice-to-haves. Never implement unverified sprawling mechanics all at once.
2. **State Transition Map**: Draw a quick state machine diagram (Mermaid) showing valid state transitions.
3. **Draft Shared Data**: Put items, constants, and types in `packages/game-data` first so both server and web client share identical definitions.
4. **Authoritative Verification**: Write unit tests for the pure game logic before hooking up UI and graphics.
5. **Juice & Polish Pass**: Add visual animations, sound effects, floating text, and keyboard shortcuts (`WASD`, `E`, `Q`, `F`, `Enter`, `Esc`).
