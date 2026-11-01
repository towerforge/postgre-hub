// Configuración de Vite: React (con el compilador de React), enrutado por
// ficheros con vite-plugin-pages, la PWA y el proxy de la API en desarrollo.
// En producción el binario de Rust sirve el build y la API en el mismo origen.

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import Pages from "vite-plugin-pages";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  resolve: {
    // Alias "@" -> src. Su par en jsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // Enrutado a partir de los ficheros de src/pages (~react-pages):
    //   index.jsx -> /, account.jsx -> /account, connections/[id].jsx -> /connections/:id.
    // Lo que empieza por guion bajo NO es una ruta: es el código de apoyo de
    // la pantalla que tiene al lado.
    Pages({
      dirs: "src/pages",
      extensions: ["jsx"],
      exclude: ["**/_*", "**/_*/**"],
      resolver: "react",
      // async -> cada página en su propio chunk (Suspense en app.jsx).
      importMode: "async",
    }),
    VitePWA({
      registerType: "autoUpdate",
      // El registro lo hace services/service-worker.js, solo en navegador: en la
      // app de escritorio no debe haber service worker.
      injectRegister: false,
      workbox: {
        navigateFallback: "index.html",
        // La API no es navegación de la SPA: el service worker no la intercepta
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: "Postgre Hub",
        short_name: "Postgre Hub",
        description: "PostgreSQL database manager",
        // Azul de la marca (--om-primary) y fondo oscuro de la app (--om-bg)
        theme_color: "#336791",
        background_color: "#17191c",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    proxy: {
      // En Docker, VITE_API_PROXY apunta al servicio `app` (ver docker-compose.override.yml)
      "/api": {
        target:
          process.env.VITE_API_PROXY ?? `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
        xfwd: true,
      },
    },
  },
});
