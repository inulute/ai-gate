# Wayland Support - Implementation Guide

## Overview
AI Gate now has **native Wayland support** with automatic detection and configuration! 🎉

## What Was Added

### Automatic Wayland Detection
The app now detects Wayland sessions and automatically enables the necessary Chromium/Electron flags:

**Detection Methods:**
```bash
# Any of these environment variables trigger Wayland mode:
WAYLAND_DISPLAY=wayland-0          # Standard Wayland indicator
XDG_SESSION_TYPE=wayland           # XDG standard
NIXOS_OZONE_WL=1                   # NixOS-specific (for your use case!)
```

### Enabled Features
When Wayland is detected, these Chromium flags are automatically enabled:
```
--enable-features=
  - WaylandWindowDecorations
  - VaapiIgnoreDriverChecks
  - VaapiVideoDecoder
  - VaapiVideoEncoder
  - AcceleratedVideoDecoder
  - AcceleratedVideoEncoder
  - UseMultiPlaneFormatForHardwareVideo
  - Ozone

--ozone-platform=wayland
```

### Custom ELECTRON_ARGS Support
Users can now pass additional Electron arguments via environment variable:

```bash
export ELECTRON_ARGS="--enable-features=NewFeatureX,NewFeatureY"
npm start
# OR for installed app:
ELECTRON_ARGS="--enable-features=..." /usr/bin/ai-gate
```

## How to Use

### NixOS Configuration
Update your NixOS configuration to use the new Wayland support:

#### Method 1: Let the app auto-detect (Recommended)
```nix
# nixos/configuration.nix
{
  environment.sessionVariables = {
    NIXOS_OZONE_WL = "1";  # Tell AI Gate to use Wayland
  };
}
```
Just ensure `NIXOS_OZONE_WL=1` is set - the app will handle the rest!

#### Method 2: With custom features (Advanced)
```nix
{
  environment.sessionVariables = {
    NIXOS_OZONE_WL = "1";
    ELECTRON_ARGS = "--enable-features=VaapiIgnoreDriverChecks,VaapiVideoDecoder,VaapiVideoEncoder,AcceleratedVideoEncoder,AcceleratedVideoDecoder,UseMultiPlaneFormatForHardwareVideo";
  };
}
```

#### Method 3: Standalone with environment-specific wrapper
```bash
#!/bin/bash
# ~/.local/bin/ai-gate-wayland
export NIXOS_OZONE_WL=1
export ELECTRON_ARGS="--enable-features=VaapiIgnoreDriverChecks,VaapiVideoDecoder,VaapiVideoEncoder,AcceleratedVideoEncoder,AcceleratedVideoDecoder,UseMultiPlaneFormatForHardwareVideo"
exec /usr/bin/ai-gate "$@"
```

Then add to .desktop file:
```ini
[Desktop Entry]
Exec=~/.local/bin/ai-gate-wayland
```

### Other Linux Distributions
For non-NixOS Wayland sessions:

```bash
# KDE Plasma (usually auto-detects)
# Just ensure XDG_SESSION_TYPE=wayland

# GNOME Wayland
# Usually auto-detects

# Manual override (any distro)
export WAYLAND_DISPLAY=wayland-0
/usr/bin/ai-gate
```

## Logging
When you launch the app, you'll see console logs indicating which display server is being used:

**Wayland Session:**
```
🖥️  Detected Wayland session - Enabling native Wayland support...
📋 Applying custom ELECTRON_ARGS from environment...
✅ Wayland flags enabled
```

**X11/Xwayland Session:**
```
🖥️  Display server: X11/Xwayland
```

## Benefits
✅ **Native Wayland rendering** - No more Xwayland compatibility layer overhead  
✅ **Better performance** - Direct communication with Wayland compositor  
✅ **Hardware acceleration** - VAAPI video encoding/decoding  
✅ **Better touchpad support** - Native Wayland input handling  
✅ **Fractional scaling** - Proper support for 125%, 150% scaling  

## Troubleshooting

### App still shows "X11/Xwayland"?
1. Check your session type:
   ```bash
   echo $XDG_SESSION_TYPE
   # Should print: wayland
   
   echo $WAYLAND_DISPLAY
   # Should print: wayland-0
   ```

2. Verify NIXOS_OZONE_WL is set (for NixOS):
   ```bash
   echo $NIXOS_OZONE_WL
   # Should print: 1
   ```

3. Rebuild NixOS if needed:
   ```bash
   sudo nixos-rebuild switch
   ```

### Graphics issues or crashes?
This indicates Electron/Chromium version or driver incompatibilities:

1. Update to latest Electron (built into the app)
2. Update GPU drivers
3. Fall back to X11 by unsetting `NIXOS_OZONE_WL`:
   ```bash
   NIXOS_OZONE_WL=0 /usr/bin/ai-gate
   ```

### Performance regression?
If Wayland mode is slower than X11, it may be driver-related:

1. Try without hardware acceleration:
   ```bash
   ELECTRON_ARGS="--disable-gpu" /usr/bin/ai-gate
   ```

2. Or revert to X11:
   ```bash
   unset NIXOS_OZONE_WL
   /usr/bin/ai-gate
   ```

## Implementation Details
- **Location**: `electron/main.ts` (lines 44-82)
- **Detection**: Checks 3 environment variables before app initialization
- **Timing**: Flags applied before `app.whenReady()` (critical for early binding)
- **Fallback**: X11/Xwayland if Wayland not detected
- **Per-session**: Redetected each time app launches

## Further Reading
- [Electron Ozone Documentation](https://github.com/electron/electron/blob/main/docs/tutorial/linux-ozone.md)
- [Chromium Ozone Documentation](https://chromium.googlesource.com/chromium/src/+/main/ui/ozone/README.md)
- [VAAPI Hardware Acceleration](https://wiki.archlinux.org/title/Hardware_video_acceleration)

---

**Version**: v4.5.0+  
**Release Date**: March 2026  
**Status**: Stable
