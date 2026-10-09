# Challenger M2_1 Progress

Last visited: 2026-10-08T16:04:00Z

## Status
Empirical verification completed for Milestone M2:
1. Frame animation byte diffs (Frame 0 vs Frame 1) verified across all 16 models and all 4 directions (Down, Left, Right, Up): 64/64 PASS (diff > 0 bytes).
2. Lowest wheel contact pixel locked at y = 37 in rows 1 and 2 across all 4 frames (cols 0..3): 128/128 PASS for all 16 models.
3. 2-wheeler saddle position at x = 24, y in 16..20 across all directions and all 4 frames: 128/128 PASS for all 8 two-wheelers.

## Verdict
CONFIRM. All geometric and animation invariants are verified empirically.
