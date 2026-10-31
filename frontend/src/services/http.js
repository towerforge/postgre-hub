// Cliente HTTP de la aplicación: la única pieza que llama a `fetch`. Los
// servicios de cada dominio usan estos helpers para no repetir cabeceras ni el
// tratamiento de errores. La sesión va en una cookie HttpOnly que pone el
// backend, así que aquí no se guarda ningún token.
// La base es relativa: el navegador solo habla con su origen y el proxy (Vite
// en desarrollo) o el propio binario en producción sirven la API.

const BASE = "/api";

/** Error con el mensaje que devuelve la API (`{ error }`) o el estado HTTP. */
const errorOf = async (res) => {
  const data = await res.json().catch(() => null);
  return new Error(data?.error ?? `${res.status} ${res.statusText}`);
};

// Fuera de las pantallas públicas, un 401 significa que la sesión caducó:
// se recarga para que la app vuelva a la pantalla de acceso.
const handleUnauthorized = (res, path) => {
  if (res.status === 401 && !path.startsWith("/auth/")) window.location.assign("/");
};

const request = async (method, path, body, signal) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    handleUnauthorized(res, path);
    throw await errorOf(res);
  }
  // Algunas respuestas llegan vacías: se devuelve un objeto vacío
  return res.json().catch(() => ({}));
};

export const apiGet = (path) => request("GET", path);

export const apiPost = (path, body, signal) => request("POST", path, body, signal);

export const apiPut = (path, body) => request("PUT", path, body);

export const apiDelete = (path) => request("DELETE", path);

/** Descarga un fichero generado por la API; devuelve `{ blob, filename }`. */
export const apiDownload = async (path, body, fallbackName) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleUnauthorized(res, path);
    throw await errorOf(res);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  return { blob: await res.blob(), filename };
};

/** Sube un fichero como multipart (campo `file`). */
export const apiUpload = async (path, file) => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    handleUnauthorized(res, path);
    throw await errorOf(res);
  }
  return res.json();
};

/**
 * Lectura de una API pública ajena (las releases de GitHub). Es la única
 * excepción a la base relativa: no pasa por el backend ni lleva sesión.
 */
export const externalGet = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw await errorOf(res);
  return res.json();
};
