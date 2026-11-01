// Entornos de una conexión (producción, staging, desarrollo) y las reglas que
// dependen de ellos: cómo se nombran, en qué orden se agrupan y qué sentencias
// piden confirmación en producción. Son datos y funciones puras sin React para
// que el formulario, la lista y el editor usen las mismas.

export const ENVIRONMENTS = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
];

// Orden de los grupos en la lista de conexiones; "" son las que no tienen entorno
export const ENVIRONMENT_ORDER = ["production", "staging", "development", ""];

/** Nombre visible de un entorno ("" → "No environment"). */
export const environmentLabel = (env) =>
  ENVIRONMENTS.find((e) => e.value === env)?.label ?? "No environment";

/** Color de texto legible (blanco o casi negro) sobre un fondo `#rrggbb`. */
export const readableOn = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // Umbral en el que el contraste con blanco y con negro se iguala
  return l > 0.179 ? "#15171a" : "#ffffff";
};

// Tapa comentarios y literales con espacios de la misma longitud: un WHERE o un
// ";" dentro de un texto no cuentan, y las posiciones siguen coincidiendo con
// las del SQL original para poder enseñarlo tal cual.
const maskLiterals = (sql) =>
  sql.replace(
    /--[^\n]*|\/\*[\s\S]*?\*\/|\$([A-Za-z_]*)\$[\s\S]*?\$\1\$|'(?:[^']|'')*'|"(?:[^"]|"")*"/g,
    (m) =>
      m.startsWith("--") || m.startsWith("/*")
        ? " ".repeat(m.length)
        : m[0] + " ".repeat(m.length - 2) + m[0],
  );

/**
 * Sentencias destructivas de un SQL: UPDATE o DELETE sin WHERE, TRUNCATE y
 * DROP. Devuelve el comienzo de cada una para enseñarlo en la confirmación.
 */
export const destructiveStatements = (sql) => {
  const masked = maskLiterals(sql);
  const found = [];
  let from = 0;
  for (const part of masked.split(";")) {
    const original = sql.slice(from, from + part.length).trim();
    from += part.length + 1;
    const head = part.trim().replace(/^WITH\b[\s\S]*?\)\s*(?=UPDATE|DELETE)/i, "");
    const destructive = /^(UPDATE|DELETE)\b/i.test(head)
      ? !/\bWHERE\b/i.test(head)
      : /^(TRUNCATE|DROP)\b/i.test(head);
    if (destructive) found.push(original.replace(/\s+/g, " ").slice(0, 80));
  }
  return found;
};
