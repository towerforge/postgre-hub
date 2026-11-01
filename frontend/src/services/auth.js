// Llamadas al dominio auth de la API (`/api/auth/*`): solo la sesión (estado,
// alta del primer usuario, entrar, salir y usuario actual). La cookie de
// sesión la pone y la borra el backend.
import { apiGet, apiPost } from "./http";

/**
 * `{ setup_required, authenticated, desktop }`: decide qué pantalla de acceso
 * se ve; `desktop` es `true` solo dentro de la app de escritorio.
 */
export const apiAuthStatus = () => apiGet("/auth/status");

/** Crea el primer usuario en una instalación nueva. */
export const apiAuthSetup = (username, password, confirmPassword) =>
  apiPost("/auth/setup", { username, password, confirm_password: confirmPassword });

export const apiAuthLogin = (username, password) => apiPost("/auth/login", { username, password });

export const apiAuthLogout = () => apiPost("/auth/logout");

/** Usuario de la sesión actual: `{ id, username }`. */
export const apiAuthMe = () => apiGet("/auth/me");
