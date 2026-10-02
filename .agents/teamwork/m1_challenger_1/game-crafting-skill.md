# Game Crafting Skill Reference (Local Copy)
Source: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\skills\game-crafting\SKILL.md

Core Methodology:
- Server Authority: Server is single source of truth for game state, inventory, currency, activities.
- Zero-Trust Client: Never accept client claims of currency, elapsed times, unverified progress.
- Idempotency: All financial & state altering transactions must enforce unique idempotency keys.
- Rigorous Testing: Independent unit tests for economy math, boundary conditions, tamper/anti-cheat validation.
