// Llamadas al dominio ssh-tunnels de la API (`/api/tunnels/*`): perfiles de
// túnel SSH reutilizables que se asignan a las conexiones.
import { apiDelete, apiGet, apiPost, apiPut } from "./http";

/** Túneles guardados: `{ tunnels }`. */
export const apiListTunnels = () => apiGet("/tunnels");

export const apiCreateTunnel = (body) => apiPost("/tunnels", body);

/** Los secretos vacíos (contraseña, clave privada) no sobrescriben los guardados. */
export const apiUpdateTunnel = (id, body) => apiPut(`/tunnels/${id}`, body);

export const apiDeleteTunnel = (id) => apiDelete(`/tunnels/${id}`);

/** Abre el túnel de prueba: `{ ok, message?, error? }`. */
export const apiTestTunnel = (id) => apiPost(`/tunnels/${id}/test`);
