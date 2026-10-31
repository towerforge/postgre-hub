// Llamadas al dominio account: la cuenta propia (cambiar nombre de usuario o
// contraseña). Vive aparte de `auth.js`, que es solo la sesión, aunque el
// endpoint cuelgue de `/api/auth/credentials`.
import { apiPut } from "./http";

/**
 * Cambia las credenciales propias. Pide siempre `current_password`; el resto
 * (`new_username`, `new_password`, `confirm_new_password`) es opcional.
 */
export const apiUpdateCredentials = (body) => apiPut("/auth/credentials", body);
