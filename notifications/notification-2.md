# AI Gate v4.5.0 — Multi-Panel Workspace Perfected 🚀

Your workspace just got smarter. Global webview state preservation, rock-solid tab synchronization, and blazing-fast layout switching.

---

> [!NOTE]
> This release fixes critical issues with tab management and webview state. Update recommended!

---

## What's New

### Global Webview Pool
The biggest change under the hood: webviews now live in a global pool instead of per-panel containers. Switching layouts (1→2→3 or back) **preserves everything**:
- ✅ URLs stay loaded
- ✅ Scroll position maintained
- ✅ Session cookies preserved
- ✅ No reload, no flash, no blank panels

### Smart Tab Synchronization
Fixed all the tab mess from before:
- 🔧 No more duplicate tabs in multiple panels
- 🔧 Tabs no longer disappear on click
- 🔧 Auto-expand (1→2→3 panels) keeps state in sync
- 🔧 Hidden panels remember their active tool

### Stability & Performance
- ⚡ Lazy webview creation (render only when activated)
- ⚡ ResizeObserver-driven bounds for exact positioning
- ⚡ Smooth CSS transitions (but never on first appearance)
- ⚡ Fixed React hooks error when adding/deleting tools
- ⚡ 0 TypeScript errors in build

## Key Fixes

| Issue | Status |
|-------|--------|
| Duplicate tabs showing simultaneously | ✅ FIXED |
| Tabs disappearing on click | ✅ FIXED |
| Blank panels on layout switch | ✅ FIXED |
| React hooks error | ✅ FIXED |
| Webview state lost on layout change | ✅ FIXED |
| Hidden panel state forgotten | ✅ FIXED |

## Under the Hood

### Architecture Refactor
- **Panel.tsx**: Now a lightweight shell (tab bar + content area ref)
- **WorkspaceGrid.tsx**: Two-layer rendering (grid shells + absolute webview pool)
- **AIToolsContext.tsx**: Smarter cleanup logic for visible vs hidden panels
- **Sidebar.tsx**: Extracted `ToolIcon` component (hooks violation fixed)

### Technical Improvements
- `useLocalStorage` now uses React functional updaters (no stale closures)
- `useLayoutEffect` ensures bounds calculated before first paint
- Functional state updaters throughout (prevents lost updates)
- Unique instance ID generation for DnD

---


## Known Limitations

- Maximum 3 panels (by design)
- Webview state is memory-resident (lost on app close; browser session storage works)
- Drag-reorder uses @dnd-kit library

---

If this update improved your workflow, please consider supporting the project:

<div align="center">

  <a href="https://support.inulute.com">
    <img src="https://img.shields.io/badge/SUPPORT_INULUTE-teal?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1zcGFya2xlcyI+PHBhdGggZD0iTTEyIDJ2MiIvPjxwYXRoIGQ9Ik0xMiAyMHYyIi8+PHBhdGggZD0iTTQuOTMgNC45M2wxLjQxIDEuNDEiLz48cGF0aCBkPSJNMTcuNjYgMTcuNjZsMS40MSAxLjQxIi8+PHBhdGggZD0iTTIgMTJoMiIvPjxwYXRoIGQ9Ik0yMCAxMmgyIi8+PHBhdGggZD0iTTYuMzQgMTcuNjZsLTEuNDEgMS40MSIvPjxwYXRoIGQ9Ik0xOS4wNyA0LjkzbC0xLjQxIDEuNDEiLz48L3N2Zz4=" alt="Support inulute" width="200" height="45px">
  </a>

  <p>Your support helps us maintain, improve, and add new features to AI Gate.</p>

</div>

---

**Released**: March 4, 2026
**Build**: 4.5.0 (855.97 kB gzip)
**Status**: Production Ready
