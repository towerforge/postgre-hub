// Llamadas al dominio connections de la API (`/api/projects/*`): las
// conexiones PostgreSQL guardadas y todo lo que se hace con una abierta
// (consultas, estructura, historial, exportar e importar). En la API se llaman
// "projects" por historia; en la interfaz y en el código, "connections".
import { apiDelete, apiDownload, apiGet, apiPost, apiPut, apiUpload } from "./http";

// ── Conexiones ───────────────────────────────────────────────────────────────

/** Conexiones guardadas, las más recientes primero: `{ projects }`. */
export const apiListProjects = () => apiGet("/projects");

export const apiGetProject = (id) => apiGet(`/projects/${id}`);

export const apiCreateProject = (body) => apiPost("/projects", body);

/** Los secretos vacíos (contraseñas, claves) no sobrescriben los guardados. */
export const apiUpdateProject = (id, body) => apiPut(`/projects/${id}`, body);

export const apiDeleteProject = (id) => apiDelete(`/projects/${id}`);

/** Abre una conexión de prueba: `{ ok, version?, error? }`. */
export const apiTestConnection = (id) => apiPost(`/projects/${id}/test`);

// ── Esquema de la base de datos ──────────────────────────────────────────────

export const apiListTables = (id) => apiGet(`/projects/${id}/tables`);

export const apiGetTableData = (id, table, schema = "public", limit = 100, offset = 0) =>
  apiGet(`/projects/${id}/tables/${table}?schema=${schema}&limit=${limit}&offset=${offset}`);

export const apiGetTableSchema = (id, table, schema = "public") =>
  apiGet(`/projects/${id}/tables/${table}/schema?schema=${schema}`);

export const apiListTypes = (id) => apiGet(`/projects/${id}/types`);

export const apiListSequences = (id) => apiGet(`/projects/${id}/sequences`);

export const apiListRoutines = (id) => apiGet(`/projects/${id}/routines`);

/** Tablas con columnas, claves primarias y foráneas (autocompletado y diagrama ER). */
export const apiGetStructure = (id) => apiGet(`/projects/${id}/structure`);

/** Sesiones activas de la base de datos (`pg_stat_activity`). */
export const apiGetSessions = (id) => apiGet(`/projects/${id}/sessions`);

// ── Consultas ────────────────────────────────────────────────────────────────

/** Ejecuta SQL. `queryId` permite cancelarla después con `apiCancelQuery`. */
export const apiRunQuery = (id, sql, queryId, signal) =>
  apiPost(`/projects/${id}/query`, { sql, query_id: queryId }, signal);

/** Cancela en el servidor la consulta en curso con ese `queryId`. */
export const apiCancelQuery = (id, queryId) =>
  apiPost(`/projects/${id}/query/cancel`, { query_id: queryId });

/** Plan de ejecución en JSON (`EXPLAIN (FORMAT JSON)`). */
export const apiExplainQuery = (id, sql) => apiPost(`/projects/${id}/query/explain`, { sql });

/** Construye (sin ejecutar) el SQL de las ediciones de la rejilla: `{ sql }`. */
export const apiBuildChanges = (id, body) => apiPost(`/projects/${id}/build-changes`, body);

// ── Historial y consultas guardadas (por usuario) ────────────────────────────

export const apiListHistory = (id, limit = 100) => apiGet(`/projects/${id}/history?limit=${limit}`);

export const apiClearHistory = (id) => apiDelete(`/projects/${id}/history`);

export const apiListSavedQueries = (id) => apiGet(`/projects/${id}/saved-queries`);

export const apiCreateSavedQuery = (id, name, sql) =>
  apiPost(`/projects/${id}/saved-queries`, { name, sql });

export const apiUpdateSavedQuery = (id, queryId, name, sql) =>
  apiPut(`/projects/${id}/saved-queries/${queryId}`, { name, sql });

export const apiDeleteSavedQuery = (id, queryId) =>
  apiDelete(`/projects/${id}/saved-queries/${queryId}`);

// ── Exportar e importar SQL ──────────────────────────────────────────────────

/** Schemas de usuario con su recuento de objetos: `{ database, schemas }`. */
export const apiListSchemas = (id) => apiGet(`/projects/${id}/schemas`);

/** Genera el volcado `.sql`; devuelve `{ blob, filename }`. */
export const apiExportDump = (id, options) =>
  apiDownload(`/projects/${id}/export`, options, "dump.sql");

/** Ejecuta un `.sql` en una sola transacción: `{ ok, statements }`. */
export const apiImportDump = (id, file) => apiUpload(`/projects/${id}/import`, file);
