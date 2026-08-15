import type { NativeImage } from 'electron';

export function normalizeTrayIcon(icon: NativeImage, _platform = process.platform): NativeImage {
  if (_platform !== 'darwin') {
    return icon;
  }

  return icon.resize({ width: 16, height: 16, quality: 'best' });
}
