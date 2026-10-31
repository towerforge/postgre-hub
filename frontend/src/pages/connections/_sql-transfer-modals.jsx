// Modales de exportar e importar SQL de la conexión abierta. Exportar genera
// en el servidor un volcado en SQL plano de los esquemas elegidos y lo
// descarga; importar ejecuta un `.sql` subido en una sola transacción. Son
// piezas del editor SQL (/connections/:id), que decide cuándo se abren.
import { useEffect, useRef, useState } from "react";
import { Download, Upload, FileText } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  InfoBox,
  Modal,
  Spinner,
  Text,
  ToolButton,
} from "@/components/ui";
import { apiListSchemas, apiExportDump, apiImportDump } from "@/services/connections";

const INCLUDE = [
  { key: "structure", label: "Structure", hint: "Types, sequences, tables, constraints, indexes" },
  { key: "data", label: "Data", hint: "Rows as INSERT statements" },
  { key: "routines", label: "Functions", hint: "Functions and procedures" },
  { key: "views", label: "Views", hint: "Including materialized views" },
  { key: "triggers", label: "Triggers", hint: "Created after the data is loaded" },
  { key: "extensions", label: "Extensions", hint: "Installed in the selected schemas" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Título de sección, con el mismo estilo que los grupos del menú lateral.
const SectionLabel = ({ children, aside }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 24 }}>
    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--om-fg-muted)", flex: 1 }}>
      {children}
    </span>
    {aside}
  </div>
);

const listBox = {
  border: "1px solid var(--om-border)",
  borderRadius: 12,
  background: "var(--om-bg)",
  overflow: "hidden",
};

const fmtBytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1024 ** 2).toFixed(1)} MB`;

// ── Exportar ──────────────────────────────────────────────────────────────────

/** Modal de exportación: elige esquemas y qué incluir, y descarga el `.sql`. */
export const ExportModal = ({ projectId, open, onClose }) => {
  const [schemas, setSchemas] = useState([]);
  const [database, setDatabase] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [include, setInclude] = useState({
    structure: true,
    data: true,
    routines: true,
    views: true,
    triggers: true,
    extensions: false,
  });
  const [drop, setDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setDone("");
    apiListSchemas(projectId)
      .then((r) => {
        setSchemas(r.schemas);
        setDatabase(r.database);
        // Los esquemas vacíos empiezan desmarcados: no aportan nada al fichero
        setSelected(
          new Set(r.schemas.filter((s) => s.tables + s.views + s.routines > 0).map((s) => s.name)),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load schemas"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const allSelected = schemas.length > 0 && selected.size === schemas.length;
  const toggleSchema = (name, on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(name);
      else next.delete(name);
      return next;
    });
  const nothingIncluded = !Object.values(include).some(Boolean);

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setDone("");
    try {
      const options = { schemas: [...selected], ...include, drop: drop && include.structure };
      const { blob, filename } = await apiExportDump(projectId, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setDone(`${filename} · ${fmtBytes(blob.size)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const footer = (
    <>
      <Text variant="hint" style={{ flex: 1 }}>
        {plural(selected.size, "schema")} from <b>{database || "…"}</b> · plain SQL
      </Text>
      <Button variant={2} size="xl" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant={1}
        size="xl"
        onClick={handleExport}
        disabled={exporting || selected.size === 0 || nothingIncluded}
      >
        <Download size={14} /> {exporting ? "Exporting…" : "Export .sql"}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Export SQL" footer={footer}>
      {loading ? (
        <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
          <Spinner label="Loading schemas…" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel
              aside={
                <ToolButton
                  onClick={() =>
                    setSelected(allSelected ? new Set() : new Set(schemas.map((s) => s.name)))
                  }
                >
                  {allSelected ? "Select none" : "Select all"}
                </ToolButton>
              }
            >
              Schemas · {selected.size} of {schemas.length}
            </SectionLabel>
            <div style={{ ...listBox, maxHeight: 232, overflowY: "auto" }}>
              {schemas.length === 0 && (
                <div style={{ padding: 12 }}>
                  <Text variant="hint">No schemas</Text>
                </div>
              )}
              {schemas.map((s, i) => (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 38,
                    padding: "0 12px",
                    borderTop: i ? "1px solid var(--om-border)" : undefined,
                  }}
                >
                  <Checkbox
                    label={s.name}
                    checked={selected.has(s.name)}
                    onChange={(on) => toggleSchema(s.name, on)}
                  />
                  <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
                    {s.tables > 0 && <Badge tone="neutral">{plural(s.tables, "table")}</Badge>}
                    {s.views > 0 && <Badge tone="neutral">{plural(s.views, "view")}</Badge>}
                    {s.routines > 0 && (
                      <Badge tone="neutral">{plural(s.routines, "function")}</Badge>
                    )}
                    {s.tables + s.views + s.routines === 0 && <Text variant="hint">empty</Text>}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Include</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
              {INCLUDE.map((opt) => (
                <Checkbox
                  key={opt.key}
                  label={opt.label}
                  description={opt.hint}
                  checked={include[opt.key]}
                  onChange={(on) => setInclude((prev) => ({ ...prev, [opt.key]: on }))}
                />
              ))}
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Options</SectionLabel>
            <Checkbox
              label="Drop schemas before recreating them"
              description="Adds DROP SCHEMA … CASCADE at the top of the file"
              checked={drop && include.structure}
              disabled={!include.structure}
              onChange={setDrop}
            />
            {drop && include.structure && (
              <Alert tone="warning">
                Importing this file deletes everything in these schemas on the target database
                before recreating them.
              </Alert>
            )}
          </section>

          {error && <Alert tone="error">{error}</Alert>}
          {done && <Alert tone="success">Downloaded {done}</Alert>}
        </div>
      )}
    </Modal>
  );
};

// ── Importar ──────────────────────────────────────────────────────────────────

/**
 * Modal de importación de un `.sql` en una sola transacción. `database` es
 * solo el nombre que se muestra; `onImported` avisa para recargar el árbol.
 */
export const ImportModal = ({ projectId, database, open, onClose, onImported }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview("");
    setError("");
    setResult(null);
  }, [open]);

  const pickFile = async (f) => {
    if (!f) return;
    setError("");
    setResult(null);
    if (!f.name.toLowerCase().endsWith(".sql")) {
      setFile(null);
      setPreview("");
      setError("Only .sql files can be imported.");
      return;
    }
    setFile(f);
    // Primeras líneas para comprobar que es el fichero correcto.
    const head = await f.slice(0, 4096).text();
    setPreview(head.split("\n").slice(0, 8).join("\n"));
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const r = await apiImportDump(projectId, file);
      setResult(r.statements);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const footer = (
    <>
      <Button variant={2} size="xl" onClick={onClose} disabled={importing}>
        {result ? "Close" : "Cancel"}
      </Button>
      <Button
        variant={1}
        size="xl"
        onClick={handleImport}
        disabled={!file || importing || result !== null}
      >
        <Upload size={14} /> {importing ? "Importing…" : "Import"}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!importing) onClose();
      }}
      title="Import SQL"
      footer={footer}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".sql,application/sql,text/plain"
          style={{ display: "none" }}
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button variant={3} onClick={() => fileRef.current?.click()} disabled={importing}>
            <FileText size={13} /> {file ? "Change file" : "Choose .sql file"}
          </Button>
          {file && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span
                style={{
                  color: "var(--om-fg-bright)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </span>
              <Badge tone="neutral">{fmtBytes(file.size)}</Badge>
            </span>
          )}
        </div>

        {preview && (
          <InfoBox style={{ whiteSpace: "pre", overflowX: "auto", wordBreak: "normal" }}>
            {preview}
          </InfoBox>
        )}

        <Alert tone="info">
          Runs against <b>{database}</b> in a single transaction: if any statement fails, nothing is
          applied.
        </Alert>

        {importing && <Spinner label="Running SQL…" />}
        {error && (
          <Alert tone="error">
            <span style={{ whiteSpace: "pre-wrap" }}>{error}</span>
          </Alert>
        )}
        {result !== null && (
          <Alert tone="success">Import completed · {result} statements executed</Alert>
        )}
      </div>
    </Modal>
  );
};
