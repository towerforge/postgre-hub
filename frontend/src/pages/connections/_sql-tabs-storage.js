// Persistencia de las pestañas del editor SQL en localStorage, una clave por
// conexión. Existe para que recargar la página (o ⌘R en la app de escritorio)
// no pierda las consultas a medio escribir. Solo se guarda lo que hace falta
// para reconstruir las pestañas, nunca los resultados.
// Los datos pueden venir de versiones antiguas, estar corruptos o no estar
// disponibles (modo privado, cuota llena): en todos esos casos se vuelve a la
// pestaña vacía de siempre sin lanzar errores.
import { newTabId } from "./_query-utils";

const KEY_PREFIX = "sql-tabs:";
const VERSION = 1;

const keyOf = (connectionId) => `${KEY_PREFIX}${connectionId}`;

const emptyTabs = () => {
  const id = newTabId();
  return { tabs: [{ id, label: "Query 1", sql: "" }], activeId: id };
};

const optionalString = (v) => (typeof v === "string" && v ? v : undefined);

/**
 * Pestañas guardadas de una conexión: `{ tabs, activeId }`. Los ids se
 * regeneran porque `newTabId` es un contador que empieza de cero en cada carga.
 */
export const loadTabs = (connectionId) => {
  if (!connectionId) return emptyTabs();
  try {
    const raw = localStorage.getItem(keyOf(connectionId));
    if (!raw) return emptyTabs();
    const data = JSON.parse(raw);
    if (data?.v !== VERSION || !Array.isArray(data.tabs)) return emptyTabs();

    let activeId = null;
    const tabs = [];
    data.tabs.forEach((t, i) => {
      if (!t || typeof t !== "object") return;
      const id = newTabId();
      tabs.push({
        id,
        label: optionalString(t.label) ?? `Query ${i + 1}`,
        sql: typeof t.sql === "string" ? t.sql : "",
        // Opcionales: mantienen la pestaña de una tabla y su consulta guardada
        schema: optionalString(t.schema),
        tableName: optionalString(t.tableName),
        savedId: optionalString(t.savedId),
      });
      if (i === data.active) activeId = id;
    });
    if (tabs.length === 0) return emptyTabs();
    return { tabs, activeId: activeId ?? tabs[0].id };
  } catch {
    return emptyTabs();
  }
};

/** Guarda las pestañas de una conexión; si el almacenamiento falla, se ignora. */
export const saveTabs = (connectionId, tabs, activeId) => {
  if (!connectionId) return;
  try {
    const data = {
      v: VERSION,
      active: Math.max(
        0,
        tabs.findIndex((t) => t.id === activeId),
      ),
      tabs: tabs.map(({ label, sql, schema, tableName, savedId }) => ({
        label,
        sql,
        schema,
        tableName,
        savedId,
      })),
    };
    localStorage.setItem(keyOf(connectionId), JSON.stringify(data));
  } catch {
    // Sin almacenamiento disponible las pestañas solo viven en memoria
  }
};
