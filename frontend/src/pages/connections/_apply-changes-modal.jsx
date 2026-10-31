// Modal «Apply pending edits» de la rejilla de resultados: enseña el SQL que
// el servidor ha generado con las ediciones, inserciones y borrados pendientes
// y lo ejecuta al confirmar. Solo pinta: generar y ejecutar el SQL lo hace la
// rejilla, que es quien tiene los cambios. Es una pieza de /connections/:id.
import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, PostgreSQL } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { Alert, Button, Modal, Spinner } from "@/components/ui";
import { editorTheme } from "./_editor-theme";

/**
 * Vista previa y confirmación de los cambios. `sql` es null mientras se
 * genera; `applying` bloquea el cierre mientras se ejecuta.
 */
export const ApplyChangesModal = ({ open, sql, error, applying, onClose, onExecute }) => (
  <Modal
    open={open}
    onClose={() => !applying && onClose()}
    title="Apply pending edits"
    width="80vw"
    height="80vh"
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        minHeight: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--om-fg-muted)" }}>
        Review the SQL below. Each statement updates only the edited columns and matches the row by
        its primary key.
      </div>
      {(sql === null && !error) || applying ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--om-bg)",
            border: "1px solid var(--om-border)",
          }}
        >
          <Spinner label={applying ? "Applying…" : "Building SQL…"} />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            border: "1px solid var(--om-border)",
            overflow: "hidden",
          }}
        >
          <CodeMirror
            value={sql ?? ""}
            theme={editorTheme}
            extensions={[sqlLang({ dialect: PostgreSQL }), EditorView.editable.of(false)]}
            height="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLineGutter: false,
            }}
            style={{ fontSize: 13, height: "100%" }}
          />
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant={3} size="sm" onClick={onClose} disabled={applying}>
          cancel
        </Button>
        <Button variant={1} size="sm" onClick={onExecute} loading={applying} disabled={!sql}>
          execute
        </Button>
      </div>
    </div>
  </Modal>
);
