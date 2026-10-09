# Task: Challenger M1_2 (Player Orientation & Driving Adversarial Test)

## Assignment
You are Challenger 2 for Milestone M1 (Fix Transform Matrix Leakage & Left Drive Inversion).
Read:
- `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`)
- `apps/web/src/game/players.ts` and `apps/web/src/game/vehicles.challenge.test.ts`.

Task:
Empirically verify driving orientation under edge cases:
1. Verify that pressing A (left movement) for all vehicle kinds (bicycle, motorcycle, car) results in vehicle sprite requesting `dir = 1`, headlight beam angled at PI (pointing left), and 2-wheeler avatar facing left (frame 3) with proper crop.
2. Verify rapid direction switches (Left -> Right -> Left, Up -> Left, Down -> Left) do not cause matrix inversion hysteresis or stale texture keys.
3. Deliver `handoff.md` with your findings and CONFIRM / REJECT verdict.


## 2026-10-08T15:27:56Z
You are Challenger 2 for Milestone M1.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\challenger_m1_2
Read your task in DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).

Empirically challenge vehicle driving orientation and avatar mounting:
1. Verify left driving (`dir === 1`) ensures vehicle sprite faces left, lights aim left, and 2-wheeler avatar faces left.
2. Verify rapid direction toggling does not cause transform matrix state leakage or inverted visual artifacts.
Deliver your verdict (CONFIRM or REJECT) in handoff.md and send_message.
