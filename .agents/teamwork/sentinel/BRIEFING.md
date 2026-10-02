# BRIEFING — 2026-10-02T03:42:30Z

## Mission
Coordinate, route, monitor, and audit the implementation of the Cozy Farm System for Cozy Compute Social MMO per docs/farm_system_plan.pdf and AGENTS.md.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\sentinel
- Orchestrator: d39205dd-01db-4096-9bff-542cd3821c40
- Victory Auditor: to be spawned on victory claim

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Must not write code or make technical decisions; keep context ultra-light
- Monitor orchestrator via two crons (Progress Reporting */8 * * * *, Liveness Check */10 * * * *)
- Cleanup crons and kill subagents on final completion

## User Context
- **Last user request**: Full implementation of Cozy Farm System (Canvas 2D graphics, FarmScene, Colyseus FarmRoom with password access control, Postgres migrations, Server-Authoritative REST APIs, HUD panels, and tests) per docs/farm_system_plan.pdf.
- **Pending clarifications**: none
- **Delivered results**: none

## Project Status
- **Phase**: in progress
- **Cron 1 (Reporting)**: task-14 (*/8 * * * *)
- **Cron 2 (Liveness)**: task-16 (*/10 * * * *)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user request
- docs/farm_system_plan.pdf — Technical design and roadmap specification
- AGENTS.md — Project development guidelines
