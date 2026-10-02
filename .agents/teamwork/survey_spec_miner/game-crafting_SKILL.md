---
name: game-crafting
description: Expert principles, workflows, and standards for building standard, beautiful, and secure multiplayer games with modern web UI and desktop packaging.
---

# Game Crafting & Social MMO Standard Skill

This skill guides the agent in developing, polishing, and securing 2D multiplayer social MMOs with server-authoritative economies and AI-integrated reward systems.

## 1. Architectural & Security Principles

- **Server Authority**: The server is the single source of truth for all game state, positions, inventory, currencies, and activity completions. The client is only an interactive visualization and input transmitter.
- **Zero-Trust Client**: Never accept client claims of Coin amounts, completed deliveries without elapsed time checks, unverified speed/teleportation, or model access tokens.
- **Idempotency**: All currency allocations, shop purchases, and AI credit redemptions must accept and enforce unique idempotency keys to prevent duplicate transactions.
- **Credential Isolation**: Upstream AI provider keys (OpenAI, Anthropic, LiteLLM upstream) must never be sent to or stored on the client. Only virtual proxy keys generated per player with strict budget limits are issued.

## 2. 2D Canvas & Pixel World Aesthetics

- **Crisp Pixel Art**: Use integer scaling and nearest-neighbor interpolation (`roundPixels: true`, `pixelArt: true` in Phaser/Canvas) to keep pixel art crisp without blurry artifacts.
- **Visual Feedback & Micro-Interactions**:
  - Emote bubbles and chat speech balloons anchored above player avatars.
  - Floating coin gain animations and punchy audio cues on currency changes.
  - Subtle depth shadows below sprites.
- **Responsive Viewport Support**: Ensure flawless layout and gameplay experience across standard viewports (720p 1280x720, 1080p 1920x1080, and 1440x900).

## 3. UI/UX & Design System Standards

- **Spacing & Layout**: Follow a consistent 8px spacing scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- **Cohesive Palette**: Modern dark/charcoal canvas (`#16141f`), deep indigo surfaces, mint/teal positive indicators, warm gold for premium states, and high-contrast typography.
- **Accessibility & Keyboard Navigation**:
  - Full keyboard control: `WASD` / Arrow keys for movement, `E` for interaction, `Q` for emote wheel, `Enter` to focus chat, `Escape` to close active modal or blur inputs.
  - ARIA attributes (`aria-label`, `role="dialog"`, `aria-modal="true"`, `aria-live="polite"`).
  - High contrast ratio adhering to WCAG 2.1 AA standards.

## 4. Rigorous Testing & Quality Matrix

- **Unit Tests**: Test all economy math, boundary conditions, leveling formulas, and activity logic independently of the DOM.
- **Tamper & Anti-Cheat Tests**: Test rejecting impossible movement velocity, instant delivery completion, and unauthorized role elevation.
- **Load Testing**: Automated load testing harness simulating concurrent player movements and chat broadcasting to verify WebSocket stability.
- **E2E Smoke Verification**: Automated headless browser testing of onboarding, navigation, interaction, and key generation flows.

## 5. Operations & Packaging

- **Production Docker Compose**: Fully orchestrated services including Caddy reverse proxy with automatic HTTPS, PostgreSQL with automated daily backup scripts, Redis, LiteLLM gateway, and game services.
- **Cross-Platform Release**: Tauri 2.x desktop bundling generating Windows x64 NSIS installers and MSI packages, accompanied by automated SHA-256 checksums and GitHub Release workflows.
