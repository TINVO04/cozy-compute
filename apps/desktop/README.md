# Cozy Compute Desktop

This is the Tauri 2 wrapper around the same production web client in `apps/web`.

Prerequisites for a Windows build:

- Rust stable with the MSVC toolchain;
- Microsoft WebView2;
- Node.js 22+ and pnpm.

From the repository root:

```powershell
pnpm install
pnpm --filter @cozy/web build
pnpm --filter @cozy/desktop dev
pnpm --filter @cozy/desktop build
```

The wrapper does not contain game logic or provider credentials. It loads the same web bundle and talks to the configured API/realtime endpoints.
