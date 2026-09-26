# Project Guidelines: Cozy Compute Social MMO

This project adheres to the `game-crafting` skill specifications and the Claude Opus 5.5 game design roadmap.

## Key Directives:

1. **Server-Authoritative Game State**: Never trust client claims for rewards, inventory, currency, or speed.
2. **Zero-Dead-Ends**: No mock placeholders or non-functional buttons.
3. **Accessibility**: Full keyboard support (`WASD`/Arrows, `E` interact, `Q` emote, `Enter` chat, `Esc` dismiss).
4. **Credential Security**: Master AI credentials live solely in server-side LiteLLM configuration. Virtual keys are sandboxed with model and balance caps.
5. **Quality Gate**: Code changes must pass `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
