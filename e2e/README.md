### Local E2E tests

Run Electron shortcut E2E tests locally:

```bash
npm run e2e
```

The suite launches the Electron app against the local Vite dev server and verifies app shell behavior. It does not assert inside external provider webviews.

Playwright does not reliably synthesize keyboard input after focus enters an Electron `<webview>` on every platform. Manually smoke test that path by clicking inside a provider webview, pressing the configured shortcut, and confirming the active app tab changes.
