// Guardado de ficheros generados por la app (CSV/JSON de un resultado, volcado
// SQL). En navegador se descarga con un `<a download>` sobre una blob URL; en
// la app de escritorio el webview no garantiza esas descargas, así que se pide
// al backend (`POST /api/desktop/save`) que abra el diálogo nativo de guardar y
// escriba el fichero. Quien llama sabe si está en escritorio por el flag
// `desktop` de `useAuth()` y lo pasa en las opciones.
import { apiPost } from "./http";

// Margen antes de revocar la blob URL: revocarla justo después del click puede
// cortar la descarga en algunos navegadores y webviews.
const REVOKE_DELAY_MS = 60_000;

/** Descarga un Blob en el navegador con un enlace temporal. */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

/**
 * Pide al backend de escritorio que guarde con el diálogo nativo. Responde
 * cuando se cierra el diálogo: `{ saved: true, path }` o `{ saved: false }` si
 * se cancela. Solo existe en escritorio (en navegador es un 404).
 */
export const apiDesktopSave = (body) => apiPost("/desktop/save", body);

/**
 * Guarda `data` (Blob o texto) como `filename`. `type` es el MIME del Blob que
 * se crea en navegador cuando llega texto. Devuelve `{ saved, path?, filename }`:
 * en navegador `saved` es siempre `true` y no hay `path` (lo decide el navegador).
 */
export const saveFile = async (data, filename, { desktop = false, type = "text/plain" } = {}) => {
  if (desktop) {
    const content = typeof data === "string" ? data : await data.text();
    const r = await apiDesktopSave({ filename, content });
    return { saved: r.saved === true, path: r.path, filename };
  }
  const blob = typeof data === "string" ? new Blob([data], { type }) : data;
  downloadBlob(blob, filename);
  return { saved: true, filename };
};
