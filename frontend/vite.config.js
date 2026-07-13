import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';   // ← MUST be this

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // ← MUST be called
  ],
  server: {
    port: 5173,
  },
});