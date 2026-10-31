// Llamadas al dominio users de la API (`/api/users`): alta, baja y cambio de
// contraseña de otros usuarios. Todos tienen el mismo nivel de acceso.
import { apiDelete, apiGet, apiPost, apiPut } from "./http";

/** Lista de usuarios: `[{ id, username, created_at }]`. */
export const apiListUsers = () => apiGet("/users");

export const apiCreateUser = (body) => apiPost("/users", body);

export const apiDeleteUser = (id) => apiDelete(`/users?id=${encodeURIComponent(id)}`);

/** Cambia la contraseña de otro usuario: `{ new_password }`. */
export const apiUpdateUser = (id, body) =>
  apiPut(`/users/update?id=${encodeURIComponent(id)}`, body);
