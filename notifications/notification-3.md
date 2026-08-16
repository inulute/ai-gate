# AI Gate v4.8.0 — Kimi, Arch packages, and icons that actually show up 🎨

New provider, a native Arch Linux package, and a fix for the sidebar icons that kept vanishing.

---

> [!NOTE]
> If you're on macOS, this release also fixes the oversized menu bar item that could push other apps' icons off screen. Update recommended!

---

## What's New

### Kimi joins the lineup
Kimi is now a built-in provider alongside ChatGPT, Gemini, Perplexity, Qwen, Claude and Grok. It shows up automatically on your next launch — and if you'd previously deleted a built-in tool, it stays deleted.

### Arch Linux packages
Releases now ship a `.pacman` alongside the AppImage and `.deb`:
- 📦 `AI.Gate-4.8.0.pacman` — Arch, Manjaro, EndeavourOS
- 📦 `AI.Gate-4.8.0.deb` — Debian, Ubuntu, Mint
- 📦 `AI.Gate-4.8.0.AppImage` — everything else

### Icons that draw offline
Three of the built-in providers pointed at icon URLs that had quietly stopped working, so the sidebar fell back to a favicon service — icons only appeared if that service was reachable and fast. All provider marks now ship **inside the app**:
- ✅ No network needed to draw them
- ✅ Readable in both light and dark themes
- ✅ Your tool domains are no longer sent to a third-party favicon service

## Key Fixes

| Issue | Status |
|-------|--------|
| macOS menu bar item enormous, hiding other apps' icons | ✅ FIXED |
| Update dialog reappearing on every launch | ✅ FIXED |
| Ordinary links opening in a small in-app window | ✅ FIXED |
| Sidebar icons missing or invisible in dark mode | ✅ FIXED |
| ChatGPT icon black-on-black in dark theme | ✅ FIXED |

## Under the Hood

### Sign-in vs. ordinary links
v4.7.1 routed every pop-up from a provider into a small AI Gate window — a rule meant for OAuth that also caught normal links. Pop-ups are now classified: recognised sign-in flows stay in-app with your shared provider session, everything else opens in your default browser.

### Smaller, cleaner downloads
- macOS is now a single **universal** `.dmg` that runs natively on both Intel and Apple Silicon — no more guessing which build to grab
- Windows ships only the per-architecture installers
- Every asset carries **build provenance** you can verify yourself:

```
gh attestation verify <file> -R inulute/ai-gate
```

---

## Known Limitations

- macOS and Windows builds are not yet code-signed, so Gatekeeper and SmartScreen will still warn on first launch
- On macOS, right-click the app and choose **Open** the first time

---

If this update improved your workflow, please consider supporting the project:

<div align="center">

  <a href="https://support.inulute.com">
    <img src="https://img.shields.io/badge/SUPPORT_INULUTE-teal?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zcGFya2xlcyI+PHBhdGggZD0iTTEyIDJ2MiIvPjxwYXRoIGQ9Ik0xMiAyMHYyIi8+PHBhdGggZD0iTTQuOTMgNC45M2wxLjQxIDEuNDEiLz48cGF0aCBkPSJNMTcuNjYgMTcuNjZsMS40MSAxLjQxIi8+PHBhdGggZD0iTTIgMTJoMiIvPjxwYXRoIGQ9Ik0yMCAxMmgyIi8+PHBhdGggZD0iTTYuMzQgMTcuNjZsLTEuNDEgMS40MSIvPjxwYXRoIGQ9Ik0xOS4wNyA0LjkzbC0xLjQxIDEuNDEiLz48L3N2Zz4=" alt="Support inulute" width="200" height="45px">
  </a>

  <p>Your support helps us maintain, improve, and add new features to AI Gate.</p>

</div>

---

**Released**: August 16, 2026
**Build**: 4.8.0 (267.17 kB gzip)
**Status**: Production Ready
