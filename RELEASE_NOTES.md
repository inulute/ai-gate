# AI Gate v4.5.0

**Release Date**: March 4, 2026  

---

<div align="center">

[![Download AI Gate v4.0.1](https://img.shields.io/badge/Download-v4.0.1-blue?style=for-the-badge)](https://aigate.inulute.com/download)

<b>Download from GitHub below or use Pling to support the project.</b>

<br><br>

<img src="https://raw.githubusercontent.com/inulute/ai-gate/refs/heads/main/screenshots/Screenshot1.png" width="720" alt="AI Gate Home"/>

</div>

# Release Notes: Multi-Panel Workspace & Tab Management Improvements

## Overview
This release introduces a complete overhaul of the workspace layout and tab management system, enabling seamless multi-panel viewing with state preservation across layout changes. Major focus on stability, performance, and user experience.

## ✨ Major Features

### Multi-Panel Workspace
- **2-Panel & 3-Panel Layouts**: View multiple AI tools simultaneously in configurable grid layouts
- **Synced & Separate Tab Modes**: 
  - **Synced Mode**: All panels show the same tab bar; click any tab to switch across panels
  - **Separate Mode**: Each panel has independent tab management
- **Smart Layout Expansion**: Auto-expand from 1→2→3 panels as you add tools (when enabled)

### Global Webview Pool Architecture
- **State Preservation**: Switching between layouts (1→2→3 or back to 1) now preserves all webview state:
  - URLs stay loaded
  - Scroll position maintained
  - Session cookies & authentication preserved
  - No reload/flashing on layout switch
- **Smoother Transitions**: CSS transitions animate webview repositioning between panels

## 🐛 Bug Fixes

### Tab Synchronization Issues
- **Fixed**: Duplicate tabs showing in multiple panels simultaneously
- **Fixed**: Tabs disappearing when clicking in non-active panels
- **Fixed**: Auto-expand (1→2→3 panels) causing tab state mismatches
- **Fixed**: Clicking inactive tabs causing content to disappear

### Panel State Management
- **Fixed**: Hidden panels losing their active tab selection when switching layouts
- **Improved**: Cleanup logic now preserves active tab assignments for hidden panels, so switching back to a wider layout instantly shows the correct tool
- **Fixed**: React hooks error ("Rendered more hooks than previous render") when adding/deleting AI tools

### Webview Rendering
- **Fixed**: Blank panels appearing when switching to wider layouts
- **Fixed**: Webview "growing from nothing" visual glitch with CSS transitions
- **Improved**: Bounds calculation now happens synchronously before first paint (useLayoutEffect)
- **Fixed**: ResizeObserver not firing when layout changes mid-CSS-transition

### Instance Management
- **Fixed**: Stale closure bug in `useLocalStorage` causing lost state updates
- **Fixed**: Tool edit/delete operations causing unnecessary re-renders
- **Improved**: Robust instance ID generation for drag-and-drop operations

## 🎨 UI/UX Improvements

### Component Refactoring
- Extracted `ToolIcon` component to fix favicon hook usage in sidebar
- Redesigned `Panel.tsx` as a lightweight shell component (tab bar + content area ref)
- Refactored `WorkspaceGrid.tsx` with two-layer rendering architecture:
  - Layer 1: Panel shells (grid layout)
  - Layer 2: Global webview pool (absolute positioning)

### Visual Smoothness
- CSS transitions only apply when repositioning between visible panels
- No transitions when appearing from hidden state (eliminating jarring "grow from zero" effect)
- Smooth grid column transitions (0.4s) when changing layouts

## 🔧 Technical Improvements

### State Management
- Improved `activePanelTabs` validation: separates logic for visible vs hidden panels
- Uniqueness enforcement in synced tab mode: prevents duplicate active instances
- Functional state updaters prevent stale closure bugs throughout

### Performance
- Lazy webview creation: only render when instance is first activated (tracked via `visitedIds`)
- ResizeObserver efficiently tracks panel bounds for exact positioning
- Memoized context values to prevent unnecessary re-renders

### Code Quality
- All TypeScript type checks pass (0 errors)
- Production build: 855.97 kB gzipped (257.84 kB)

## 📋 Settings & Configuration

The following settings now work together:
- **`syncedTabs`**: Toggle between synced (all panels show all tabs) and separate mode
- **`autoLayout`**: Auto-expand layout as you add tools
- **`defaultLayout`**: Starting layout preference (1, 2, or 3 panels)

## ⚠️ Known Limitations

- Maximum 3 panels in current layout system
- Webview state is memory-resident (lost on app close; localStorage for browser session restoration)
- Drag-and-drop tab reordering within panels uses @dnd-kit library

## 🙏 Testing Notes

Thoroughly tested workflows:
1. ✅ Switch between 1/2/3 panel layouts while tools are active
2. ✅ Add/delete AI tools in multi-panel mode
3. ✅ Toggle synced vs separate tab modes
4. ✅ Drag & drop tabs to reorder
5. ✅ Navigate pages within webviews while switching layouts

---

Access all your AI tools seamlessly in one place.

## 🚀 Installation

**Windows**: Download the appropriate .exe for your system and run
**macOS**: Download the .dmg, open it, and drag AI Gate to Applications
**Linux**: Download .AppImage, make it executable (`chmod +x`), and run

## 🔒 Verification

Verify file integrity using SHA256SUMS.txt

## 🐛 Report Issues

https://github.com/inulute/ai-gate/issues


**Full Changelog**: https://github.com/inulute/ai-gate/compare/v4.0.1...v4.5.0