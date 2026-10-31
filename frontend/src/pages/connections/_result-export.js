// Descarga del resultado de una consulta en CSV o JSON, generado en el
// navegador a partir de lo que ya se tiene en pantalla, sin volver a pedirlo
// a la API.
// Los valores llegan como texto desde el backend (simple_query); en JSON se
// convierten los tipos que tienen representación nativa sin perder precisión.
const INT_TYPES = new Set(["int2", "int4", "oid"]);
const FLOAT_TYPES = new Set(["float4", "float8"]);
const JSON_TYPES = new Set(["json", "jsonb"]);

const jsonValue = (raw, type) => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw);
  if (INT_TYPES.has(type) || FLOAT_TYPES.has(type)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  if (type === "bool") return s === "t" || s === "true";
  if (JSON_TYPES.has(type)) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
};

const csvCell = (raw) => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV con cabecera y saltos `\r\n`, como lo espera Excel. */
export const resultToCsv = (result) => {
  const lines = [result.columns.map((c) => csvCell(c.name)).join(",")];
  for (const row of result.rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
};

/** JSON como lista de objetos, con números, booleanos y JSON en su tipo nativo. */
export const resultToJson = (result) => {
  const objects = result.rows.map((row) => {
    const obj = {};
    result.columns.forEach((c, i) => {
      obj[c.name] = jsonValue(row[i], c.type);
    });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
};

/** Descarga el resultado como `<baseName>-<fecha>.csv|json`. */
export const downloadResult = (result, format, baseName = "query") => {
  const content = format === "csv" ? resultToCsv(result) : resultToJson(result);
  // BOM en CSV para que Excel detecte UTF-8.
  const blob =
    format === "csv"
      ? new Blob(["﻿", content], { type: "text/csv;charset=utf-8" })
      : new Blob([content], { type: "application/json" });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}-${stamp}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
};
