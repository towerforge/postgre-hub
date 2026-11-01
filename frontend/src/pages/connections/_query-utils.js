// Utilidades sin React del editor SQL: sacar tablas de una consulta, agrupar
// por esquema, formatear tamaños y filas, generar ids de pestaña y de consulta
// y preparar el esquema del autocompletado. Están aparte para que las piezas
// de la pantalla las compartan sin importarse entre sí.
/** Tablas (`esquema.tabla` o `tabla`) que aparecen tras FROM o JOIN, sin repetir. */
export const parseTablesFromSQL = (sql) => {
  const tables = [];
  const re = /(?:FROM|JOIN)\s+(?:"(\w+)"\."(\w+)"|(\w+)\.(\w+)|"(\w+)"|([a-z_]\w*))/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const t =
      m[1] && m[2] ? `${m[1]}.${m[2]}` : m[3] && m[4] ? `${m[3]}.${m[4]}` : (m[5] ?? m[6] ?? null);
    if (t) tables.push(t);
  }
  return [...new Set(tables)];
};

/** Agrupa tablas por esquema: `{ esquema: [tablas] }`. */
export const groupBy = (items) =>
  items.reduce((acc, t) => {
    if (!acc[t.schema]) acc[t.schema] = [];
    acc[t.schema].push(t);
    return acc;
  }, {});

/** Tamaño legible (B, KB, MB, GB); cadena vacía si no hay dato o es cero. */
export const fmtSize = (bytes) => {
  if (bytes == null) return "";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return bytes > 0 ? `${bytes} B` : "";
};

/** Número de filas abreviado (1.2k, 3.40M); cadena vacía si es desconocido. */
export const fmtRows = (n) => {
  if (n == null || n < 0) return "";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
};

let _tabCtr = 0;
/** Id único de pestaña dentro de la sesión. */
export const newTabId = () => `tab_${++_tabCtr}`;

/** Letra de columna al estilo Excel: 0 → A, 25 → Z, 26 → AA… */
export const excelCol = (n) => {
  let s = "";
  let k = n + 1;
  while (k > 0) {
    k--;
    s = String.fromCharCode(65 + (k % 26)) + s;
    k = Math.floor(k / 26);
  }
  return s;
};

// Tipos de Postgres que se alinean a la derecha y con cifras de ancho fijo
const NUMERIC_TYPES = new Set([
  "int2",
  "int4",
  "int8",
  "smallint",
  "integer",
  "bigint",
  "numeric",
  "decimal",
  "float4",
  "float8",
  "real",
  "double precision",
  "money",
  "oid",
]);

/** Indica si una columna de resultado es numérica según su tipo de Postgres. */
export const isNumericType = (type) => NUMERIC_TYPES.has((type ?? "").toLowerCase());

/**
 * Id para poder cancelar una consulta. `crypto.randomUUID` solo existe en
 * contextos seguros (HTTPS o localhost); fuera de ellos se genera a mano.
 */
export const newQueryId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

/** Esquema para el autocompletado de CodeMirror: esquema → tabla → columnas. */
export const completionSchema = (structure) => {
  const ns = {};
  for (const t of structure?.tables ?? []) {
    ns[t.schema] ??= {};
    ns[t.schema][t.name] = {
      self: { label: t.name, type: "type", detail: t.kind.replace("_", " ") },
      children: t.columns.map((c) => ({ label: c.name, type: "property", detail: c.type })),
    };
  }
  return ns;
};
