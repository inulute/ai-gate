import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Always use relative paths so assets load correctly in both:
  // - Electron (file:// protocol — absolute paths resolve to filesystem root)
  // - Web browsers (works fine with relative paths from any server root)
  // Previously this was conditional on ELECTRON=true, which caused blank screens
  // when building without that env var (e.g., AUR/distro package builds).
  base: './',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    watch: {
      // flatpak/build-dir and flatpak/.flatpak-builder/cache contain mounted
      // system filesystems (e.g. /var/run/udev) with circular symlinks that
      // crash Vite's FSWatcher with ELOOP -40.  Use a function-based ignore so
      // chokidar skips the entire flatpak subtree before it tries to stat files.
      ignored: (filePath: string) => filePath.includes('/flatpak/') || filePath.endsWith('/flatpak'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: false,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-switch',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-label',
      '@radix-ui/react-alert-dialog',
    ],
  },
})