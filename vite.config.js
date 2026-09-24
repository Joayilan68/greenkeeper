import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "fs";

// Nombre de fonctions serveur Vercel (api/*.js) — affiché dans Pilotage → Services (plafond Hobby : 12)
const API_FUNCTIONS = readdirSync(new URL("./api", import.meta.url)).filter(f => f.endsWith(".js")).length;

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  define: { __API_FUNCTIONS__: API_FUNCTIONS },
});
