// Panel inferior del editor SQL con dos pestañas: el historial de ejecuciones
// y las consultas guardadas, ambos en el servidor por usuario y conexión. Un
// clic carga la consulta en el editor. Es una pieza de /connections/:id.
import { useEffect, useState } from "react";
import { Bookmark, History, Trash2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, PostgreSQL } from "@codemirror/lang-sql";
import { editorTheme } from "./_editor-theme";
import { Tab, TabBar, Tabs, ToolButton } from "@/components/ui";
import {
  apiListHistory,
  apiClearHistory,
  apiListSavedQueries,
  apiDeleteSavedQuery,
} from "@/services/connections";

// Extensiones fijas: se crean una vez para no reconfigurar cada vista previa.
const PREVIEW_EXTENSIONS = [sqlLang({ dialect: PostgreSQL })];
const PREVIEW_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLineGutter: false,
  highlightActiveLine: false,
  searchKeymap: false,
  defaultKeymap: false,
};

// Vista previa de solo lectura, con el mismo resaltado que el editor.
const SqlPreview = ({ sql }) => (
  <CodeMirror
    value={sql}
    theme={editorTheme}
    extensions={PREVIEW_EXTENSIONS}
    editable={false}
    basicSetup={PREVIEW_SETUP}
    style={{ fontSize: 12 }}
  />
);

// Hora si es de hoy; si no, día, mes y hora.
const fmtWhen = (unix) => {
  const d = new Date(unix * 1000);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" }) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const metaStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 8px 2px 8px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--om-fg-muted)",
};

/**
 * Panel inferior del editor: historial de ejecuciones y consultas guardadas,
 * ambos persistidos en el servidor por usuario y conexión.
 * `version` cambia cuando el editor ejecuta o guarda algo, para recargar;
 * `activeSql` resalta la entrada igual a la pestaña activa; `onLoad(sql)` la
 * carga en la pestaña activa y `onOpenSaved(query)` abre una guardada en otra.
 */
export const QueryHistoryPanel = ({ projectId, activeSql, version, onLoad, onOpenSaved }) => {
  const [tab, setTab] = useState("history");
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    apiListHistory(projectId, 50)
      .then((r) => setHistory(r.history))
      .catch(() => {});
    apiListSavedQueries(projectId)
      .then((r) => setSaved(r.queries))
      .catch(() => {});
  }, [projectId, version]);

  const clearHistory = () => {
    apiClearHistory(projectId)
      .then(() => setHistory([]))
      .catch(() => {});
  };

  const deleteSaved = (q, e) => {
    e.stopPropagation();
    apiDeleteSavedQuery(projectId, q.id)
      .then(() => setSaved((s) => s.filter((x) => x.id !== q.id)))
      .catch(() => {});
  };

  return (
    <>
      {/* Mismas pestañas que el editor; el cuerpo va fuera para conservar el
          scroll de .body */}
      <Tabs value={tab} onChange={setTab}>
        <TabBar
          className="hist-tabs"
          actions={
            tab === "history" &&
            history.length > 0 && (
              <ToolButton
                size="sm"
                onClick={clearHistory}
                title="Delete your history for this connection"
              >
                <Trash2 size={12} /> Clear
              </ToolButton>
            )
          }
        >
          <Tab
            id="history"
            icon={<History size={14} className="hist-ico" />}
            badge={history.length || undefined}
          >
            History
          </Tab>
          <Tab
            id="saved"
            icon={<Bookmark size={14} className="hist-ico" />}
            badge={saved.length || undefined}
          >
            Saved
          </Tab>
        </TabBar>
      </Tabs>
      <div className="body">
        {tab === "history" ? (
          history.length === 0 ? (
            <div className="empty">No queries yet.</div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className={`item${h.sql === activeSql ? " active" : ""}`}
                title="Click to load into editor"
                onClick={() => onLoad(h.sql)}
              >
                <div style={metaStyle}>
                  <span>{fmtWhen(h.created_at)}</span>
                  <span>{h.duration_ms} ms</span>
                  {h.error ? (
                    <span style={{ color: "var(--om-red)" }} title={h.error}>
                      error
                    </span>
                  ) : (
                    h.rows !== null && <span>{h.rows} rows</span>
                  )}
                </div>
                <SqlPreview sql={h.sql} />
              </div>
            ))
          )
        ) : saved.length === 0 ? (
          <div className="empty">
            No saved queries. Use Save in the editor to keep the active tab here.
          </div>
        ) : (
          saved.map((q) => (
            <div
              key={q.id}
              className="item"
              title="Click to open in a new tab"
              onClick={() => onOpenSaved(q)}
            >
              <div
                style={{
                  ...metaStyle,
                  color: "var(--om-fg-bright)",
                  fontFamily: "var(--font-family)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 600 }}>{q.name}</span>
                <span
                  style={{
                    color: "var(--om-fg-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                >
                  {fmtWhen(q.updated_at)}
                </span>
                <div style={{ flex: 1 }} />
                <ToolButton
                  size="sm"
                  iconOnly
                  onClick={(e) => deleteSaved(q, e)}
                  title="Delete saved query"
                >
                  <Trash2 size={12} />
                </ToolButton>
              </div>
              <SqlPreview sql={q.sql} />
            </div>
          ))
        )}
      </div>
    </>
  );
};
