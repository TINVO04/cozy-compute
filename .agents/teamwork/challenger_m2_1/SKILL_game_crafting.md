# Game Crafting & Social MMO Standard Skill (Local Dump)

This skill guides the agent in developing, polishing, and securing 2D multiplayer social MMOs with server-authoritative economies and AI-integrated reward systems.

## 1. Architectural & Security Principles
- Server Authority: The server is the single source of truth.
- Zero-Trust Client: Never accept client claims.
- Idempotency: Unique idempotency keys.
- Credential Isolation: Master keys kept server-side.

## 2. 2D Canvas & Pixel World Aesthetics
- Crisp Pixel Art: Integer scaling, nearest-neighbor interpolation, crisp pixels.
- Visual Feedback & Micro-Interactions: Depth shadows below sprites.
- Responsive Viewport Support.

## 3. UI/UX & Design System Standards
- Spacing & Layout: 8px scale.
- Cohesive Palette.
- Accessibility & Keyboard Navigation.

## 4. Rigorous Testing & Quality Matrix
- Unit Tests, Tamper Tests, Load Testing, E2E Smoke Verification.

## 5. Operations & Packaging
- Production Docker Compose, Tauri packaging.
