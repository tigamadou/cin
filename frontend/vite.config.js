import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // écoute sur toutes les interfaces
    port: 5173,
    strictPort: false,
    hmr: {
      host: "host.docker.internal", // pour que le navigateur trouve le serveur HMR
      port: 5173
    },
    proxy: {
      "/api": {
        target: "http://web:8000", // ou http://127.0.0.1:8000 si frontend tourne sur l'hôte
        changeOrigin: false, // <-- conserve le Host d'origine (browser)
        secure: false
      },
      "/media": {
        target: "http://web:8000",
        changeOrigin: false,
        secure: false
      }
    }
  }
})
