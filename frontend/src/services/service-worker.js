// Service worker de la PWA, solo en navegador. Antes lo registraba
// vite-plugin-pwa sin condiciones; ahora se registra a mano una vez que
// `/api/auth/status` dice si la app corre en el escritorio (Tauri). Allí la SPA
// la sirve el propio binario en loopback y un SW cachearía versiones antiguas
// entre actualizaciones, así que se desregistra cualquiera que quedase.
// No es un dominio de la API: no pasa por `http.js` porque no hace peticiones
// propias.

let configured = false;

/** Registra el SW en navegador o retira los existentes en escritorio; solo la primera vez. */
export const setupServiceWorker = async (desktop) => {
  if (configured || !("serviceWorker" in navigator)) return;
  configured = true;
  if (desktop) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {
      // Sin acceso a los registros no hay nada que limpiar
    }
    return;
  }
  // Mismo registro que inyectaba vite-plugin-pwa (`registerSW.js`): `/sw.js` en
  // el ámbito raíz, tras `load`. El SW generado con `registerType: "autoUpdate"`
  // ya hace skipWaiting y clientsClaim. No se usa `virtual:pwa-register` porque
  // exige la dependencia workbox-window y añadiría la recarga automática, que
  // antes no existía. En desarrollo no hay `/sw.js` (devOptions desactivado).
  if (!import.meta.env.PROD) return;
  const register = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
};
