# GitHub Build + Release Plan

## Goal

GitHub is the source/control plane for code and the release surface for Windows installers.

## Recommended release artifacts

- Windows x64 NSIS setup `.exe` as primary;
- optional `.msi` for enterprise/manual installs;
- SHA256 checksum;
- release notes;
- version metadata.

Tauri supports Windows `.msi` and NSIS setup `.exe` bundles. GitHub Actions support is documented via `tauri-action`. [Tauri Windows](https://tauri.app/distribute/windows-installer/) [Tauri GitHub](https://v2.tauri.app/distribute/pipelines/github/)

## Branching

- `main` protected;
- feature branches;
- pull request required for merge;
- release tags `vMAJOR.MINOR.PATCH`.

## CI checks on pull request

- install dependencies;
- typecheck;
- lint;
- unit tests;
- backend integration tests;
- build web;
- build Tauri shell without release publish;
- optional Playwright smoke tests.

## Release workflow

Trigger on `v*` tag.

1. checkout;
2. setup Node LTS;
3. setup Rust stable;
4. install frontend dependencies;
5. run tests;
6. build web;
7. build Tauri Windows x64;
8. package NSIS installer;
9. calculate SHA256;
10. create GitHub Release;
11. upload artifacts;
12. write generated release notes from changelog.

## Automatic updater

Defer auto-update until the first stable release. Once enabled, use signed updates and publish only from trusted release workflows.

## Versioning

The game version, Tauri bundle version and release tag must be generated from one version source to avoid mismatches.
