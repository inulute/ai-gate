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
    port: 5173
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