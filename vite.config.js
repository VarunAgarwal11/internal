import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // strictPort, because Vite's default is to silently walk up from 5173 when a port is
    // busy. Several dev servers live in that range on this machine, so "it started fine"
    // can mean it started on someone else's port — and a tunnel or a bookmark pointed at
    // whichever app won the race costs an afternoon before anyone suspects the port.
    // Refusing to start is the cheaper failure.
    strictPort: true,
    // Vite 8 refuses requests addressed to a Host it wasn't told about; a tunnel hostname is
    // by definition unknown, so every ngrok request would 403 with "Blocked request".
    // Dev-server only — `vite build` output never reads this.
    allowedHosts: true,
    proxy: {
      // Same-origin in dev and prod, so the session cookie needs no CORS credentials and
      // SameSite=Lax is enough to block cross-site POSTs.
      '/api': { target: 'http://127.0.0.1:8002', changeOrigin: true },
    },
  },
})
