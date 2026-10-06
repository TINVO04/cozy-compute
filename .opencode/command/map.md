---
description: Tự động phân tích ảnh và tạo bản đồ game tương tác sống động sắc nét 1:1.
---

Load and apply the `image-to-interactive-map` skill on the provided image input: "$ARGUMENTS".

Execute the 6-step pipeline:

1. Inspect the image at "$ARGUMENTS", maintain 100% 1:1 native pixel scale without fractional scaling or blur.
2. Slice and defringe sprites into clean RGBA PNGs using `.agents/skills/image-to-interactive-map/scripts/slice_and_defringe.py` to eliminate all white halos.
3. Outpaint canvas to 1536x1024 using `.agents/skills/image-to-interactive-map/scripts/outpaint_canvas.py`.
4. Inject living animations (wandering livestock with hearts, rotating waterwheel aerator, dynamic crop lifecycle).
5. Synchronize authoritative BLOCKERS, POIS, and ZONES in `packages/game-data/src/map.ts`.
6. Verify with `pnpm typecheck`, `pnpm test`, `pnpm lint`, and capture Playwright screenshot verification.
