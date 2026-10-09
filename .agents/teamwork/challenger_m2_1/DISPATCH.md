# Task: Challenger M2_1 (Frame Animation & Byte Diff Verification)

## Assignment
You are Challenger 1 for Milestone M2 (Master WOW 2.5D Generator Upgrade & 16-Vehicle Assets).
Read:
- `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`)

Task:
Empirically test that:
1. All 16 models in `assets/vehicles/` have non-zero diff bytes between frame 0 and frame 1 in ALL 4 directions:
   - Row 0 (Down): diff > 0 bytes (MUST NOT BE 0)
   - Row 1 (Left): diff > 0 bytes
   - Row 2 (Right): diff > 0 bytes
   - Row 3 (Up): diff > 0 bytes (MUST NOT BE 0)
2. Wheel contact baseline in rows 1 and 2 is strictly locked at y = 37 across ALL 4 frames for all 16 models.
3. Two-wheeler saddle position remains strictly inside x = 24, y in 16..20 across all 4 frames.
4. Deliver `handoff.md` with your findings and CONFIRM / REJECT verdict.


## 2026-10-08T15:55:52Z
You are Challenger 1 for Milestone M2.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\challenger_m2_1
Read your task in DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).

Empirically test frame animation diffs and geometry invariants:
1. Write and run a script to verify that all 16 models in `assets/vehicles/` have non-zero diff bytes between frame 0 and frame 1 in ALL 4 directions (Down, Left, Right, Up).
2. Verify lowest wheel contact pixel in rows 1 and 2 is strictly locked at y = 37 across ALL 4 frames for all 16 models.
3. Verify 2-wheeler saddle remains in x = 24, y in 16..20 across all frames.
Deliver your verdict (CONFIRM or REJECT) in handoff.md and send_message.
