---
description: Kích hoạt quy trình image-to-interactive-map để phân tích ảnh và tạo bản đồ game sống động sắc nét.
---

Load and apply the `image-to-interactive-map` skill immediately.
Target image or input instructions: "$ARGUMENTS".

Execute the 6-step pipeline:

1. Input Analysis & Canvas Fit: Inspect the image, maintain 100% 1:1 native pixel scale without fractional scaling or blur.
2. Semantic Slicing & Defringing: Extract individual buildings, pens, pond, crops, and props into clean RGBA PNGs using `.agents/skills/image-to-interactive-map/scripts/slice_and_defringe.py` to eliminate all white halos.
3. Seamless Outpainting: Center the 1:1 map into the 1536x1024 canvas and extend natural borders using `.agents/skills/image-to-interactive-map/scripts/outpaint_canvas.py`.
4. Living Dynamics & Animation Injection: Spawn animated livestock (chickens, cows) with Wander AI, animate water ripples/aerator, and connect 36 dynamic crop plots.
5. Authoritative Game-Data Synchronization: Synchronize BLOCKERS, POIS, and ZONES in `packages/game-data/src/map.ts`.
6. Automated Quality Gate: Verify typecheck, vitest tests, eslint, and capture headless Playwright screenshot verification.
