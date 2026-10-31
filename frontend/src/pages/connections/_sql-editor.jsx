// Zona central del editor SQL (/connections/:id): pestañas de consulta con
// CodeMirror, ejecución y cancelación, guardado de consultas y el resultado
// de cada pestaña. También rellena la barra de estado y el panel inferior de
// historial, que son de la aplicación. El estado de las pestañas vive aquí
// porque lo comparten el editor, el resultado, el inspector y el historial.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Play,
  Square,
  Terminal,
  Maximize2,
  Minimize2,
  X,
  Plus,
  FileCode2,
  Save,
  Lock,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, PostgreSQL } from "@codemirror/lang-sql";
import { keymap } from "@codemirror/view";
import { editorTheme } from "./_editor-theme";
import { useSetStatusBar } from "@/contexts/status-bar-context";
import { useSetHistoryBar } from "@/contexts/history-bar-context";
import { Alert, Spinner, ToolButton, useSpinner } from "@/components/ui";
import {
  apiRunQuery,
  apiCancelQuery,
  apiCreateSavedQuery,
  apiUpdateSavedQuery,
} from "@/services/connections";
import { QueryInspector } from "./_query-inspector";
import { QueryResultView } from "./_query-result-view";
import { QueryHistoryPanel } from "./_query-history-panel";
import { ShortcutsButton } from "./_keyboard-shortcuts";
import { newTabId, newQueryId, parseTablesFromSQL, completionSchema } from "./_query-utils";

// Si la cancelación en el servidor no responde en este tiempo, se corta la petición.
const CANCEL_ABORT_MS = 3000;

// Traduce los errores de cancelación de Postgres a un mensaje claro.
const queryErrorMessage = (msg, timeoutSecs) => {
  if (msg.includes("canceling statement due to user request")) return "Query cancelled.";
  if (msg.includes("canceling statement due to statement timeout"))
    return `Query cancelled: it exceeded the ${timeoutSecs}s timeout set for this connection.`;
  return msg;
};

const EDITOR_HEIGHT_DEFAULT = 120;
const EDITOR_HEIGHT_EXPANDED = 300;

/**
 * Pestañas de consulta con su editor, su resultado y su inspector. Las
 * pestañas nuevas llegan por `newTabReq` (`{ key, sql, label, autoRun?,
 * schema?, tableName?, savedId? }`): cada `key` distinta abre una. `schema` y
 * `tableName` marcan la pestaña como de una tabla, lo que permite editar el
 * resultado; `structure` alimenta el autocompletado.
 */
export const SqlEditor = ({
  projectId,
  project,
  newTabReq,
  tables,
  structure,
  showInspector = true,
}) => {
  const [tabs, setTabs] = useState(() => {
    const id = newTabId();
    return [{ id, label: "Query 1", sql: "" }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [renamingTabId, setRenamingTabId] = useState(null);
  const [tabResults, setTabResults] = useState({});
  const [tabErrors, setTabErrors] = useState({});
  const [tabInspectors, setTabInspectors] = useState({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const runSpinner = useSpinner(loading);
  // Cambia tras cada ejecución o guardado para que el panel inferior recargue.
  const [historyVersion, setHistoryVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const readOnly = project?.read_only ?? false;

  useEffect(() => {
    if (!newTabReq) return;
    const id = newTabId();
    setTabs((ts) => [
      ...ts,
      {
        id,
        label: newTabReq.label,
        sql: newTabReq.sql,
        schema: newTabReq.schema,
        tableName: newTabReq.tableName,
        savedId: newTabReq.savedId,
      },
    ]);
    setActiveTabId(id);
    if (newTabReq.autoRun) {
      setTimeout(() => runQueryRef.current?.(newTabReq.sql, id), 0);
    }
  }, [newTabReq?.key]); // eslint-disable-line react-hooks/exhaustive-deps -- solo una pestaña por petición

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const activeSql = activeTab?.sql ?? "";

  const setSql = useCallback(
    (sql) => {
      setTabs((ts) => ts.map((t) => (t.id === activeTabId ? { ...t, sql } : t)));
    },
    [activeTabId],
  );

  const addTab = () => {
    const id = newTabId();
    const label = `Query ${tabs.length + 1}`;
    setTabs((ts) => [...ts, { id, label, sql: "" }]);
    setActiveTabId(id);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    setTabs((ts) => {
      const next = ts.filter((t) => t.id !== id);
      if (next.length === 0) {
        const newId = newTabId();
        setActiveTabId(newId);
        return [{ id: newId, label: "Query 1", sql: "" }];
      }
      if (id === activeTabId) {
        const idx = ts.findIndex((t) => t.id === id);
        setActiveTabId(next[Math.max(0, idx - 1)].id);
      }
      return next;
    });
  };

  const loadingRef = useRef(false);
  const runningRef = useRef(null);

  const runQueryRef = useRef(undefined);

  const runQuery = useCallback(
    async (overrideSql, overrideTabId) => {
      const q = (overrideSql ?? activeSql).trim();
      const tid = overrideTabId ?? activeTabId;
      if (!q || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setTabErrors((er) => ({ ...er, [tid]: "" }));
      const start = Date.now();
      const running = { queryId: newQueryId(), abort: new AbortController() };
      runningRef.current = running;
      try {
        const r = await apiRunQuery(projectId, q, running.queryId, running.abort.signal);
        setTabResults((rs) => ({ ...rs, [tid]: r }));
        const duration = r.duration_ms ?? Date.now() - start;
        setTabInspectors((ins) => ({
          ...ins,
          [tid]: {
            database: project?.database ?? "",
            duration,
            rows: r.affected !== undefined ? r.affected : r.rows.length,
            total: r.total,
            tables: parseTablesFromSQL(q),
            columns: r.columns,
          },
        }));
      } catch (e) {
        const msg =
          e instanceof DOMException && e.name === "AbortError"
            ? "Query cancelled."
            : queryErrorMessage(
                e instanceof Error ? e.message : "Query failed",
                project?.query_timeout ?? 0,
              );
        setTabErrors((er) => ({ ...er, [tid]: msg }));
        setTabResults((rs) => ({ ...rs, [tid]: null }));
        setTabInspectors((ins) => ({ ...ins, [tid]: null }));
      } finally {
        runningRef.current = null;
        loadingRef.current = false;
        setLoading(false);
        setHistoryVersion((v) => v + 1);
      }
    },
    [activeSql, activeTabId, projectId, project],
  );

  runQueryRef.current = runQuery;

  // Pide a Postgres que cancele; si no contesta a tiempo se corta la petición,
  // y el backend cancela igualmente al ver la conexión cerrada.
  const cancelQuery = () => {
    const running = runningRef.current;
    if (!running) return;
    apiCancelQuery(projectId, running.queryId).catch(() => running.abort.abort());
    setTimeout(() => {
      if (runningRef.current === running) running.abort.abort();
    }, CANCEL_ABORT_MS);
  };

  // Guarda la pestaña activa con su nombre; si ya venía de una guardada, la actualiza.
  const saveActiveTab = async () => {
    const tab = activeTab;
    if (!tab?.sql.trim() || saving) return;
    const name = tab.label.replace(/\.sql$/i, "");
    setSaving(true);
    try {
      if (tab.savedId) {
        await apiUpdateSavedQuery(projectId, tab.savedId, name, tab.sql);
      } else {
        const r = await apiCreateSavedQuery(projectId, name, tab.sql);
        setTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, savedId: r.id } : t)));
      }
      setHistoryVersion((v) => v + 1);
    } catch (e) {
      setTabErrors((er) => ({
        ...er,
        [tab.id]: e instanceof Error ? e.message : "Failed to save query",
      }));
    } finally {
      setSaving(false);
    }
  };

  const openSaved = (q) => {
    const existing = tabs.find((t) => t.savedId === q.id);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const id = newTabId();
    setTabs((ts) => [...ts, { id, label: q.name, sql: q.sql, savedId: q.id }]);
    setActiveTabId(id);
  };

  // Memorizadas: si cambian en cada render, CodeMirror se reconfigura entero.
  const extensions = useMemo(
    () => [
      sqlLang({
        dialect: PostgreSQL,
        schema: completionSchema(structure),
        defaultSchema: "public",
        upperCaseKeywords: true,
      }),
      keymap.of([
        {
          key: "Ctrl-Enter",
          run: () => {
            void runQueryRef.current?.();
            return true;
          },
        },
        {
          key: "Mod-Enter",
          run: () => {
            void runQueryRef.current?.();
            return true;
          },
        },
      ]),
    ],
    [structure],
  );

  const editorH = expanded ? EDITOR_HEIGHT_EXPANDED : EDITOR_HEIGHT_DEFAULT;
  const activeResult = tabResults[activeTabId] ?? null;
  const activeError = tabErrors[activeTabId] ?? "";
  const activeInspector = tabInspectors[activeTabId] ?? null;

  useSetHistoryBar(
    <QueryHistoryPanel
      projectId={projectId}
      activeSql={activeSql}
      version={historyVersion}
      onLoad={setSql}
      onOpenSaved={openSaved}
    />,
    [projectId, activeSql, historyVersion, setSql, tabs],
  );

  useSetStatusBar(
    <>
      <ShortcutsButton />
      {readOnly && (
        <span className="statusbar-section" title="Every transaction starts as READ ONLY">
          <span
            className="v yellow"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Lock size={11} /> read-only
          </span>
        </span>
      )}
      {tabs.length > 0 && (
        <span className="statusbar-section">
          <span className="k">tabs</span>
          <span className="v">
            {tabs.findIndex((t) => t.id === activeTabId) + 1}/{tabs.length}
          </span>
        </span>
      )}
      {activeError && (
        <span className="statusbar-section">
          <span className="v red">● error</span>
        </span>
      )}
      {loading && (
        <span className="statusbar-section">
          <span className="v yellow">⟳ running…</span>
        </span>
      )}
    </>,
    [tabs, activeTabId, activeError, loading, readOnly],
  );

  const tabsBar = (
    <div className="vsc-tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isRenaming = renamingTabId === tab.id;
        const isDirty = !!tab.sql && !tab.tableName;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) closeTab(tab.id, e);
            }}
            className={`vsc-tab${isActive ? " active" : ""}`}
          >
            <span className="ico">
              <FileCode2 size={14} />
            </span>
            {isRenaming ? (
              <input
                autoFocus
                defaultValue={tab.label}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) setTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, label: v } : t)));
                  setRenamingTabId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                  if (e.key === "Escape") setRenamingTabId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 100,
                  fontSize: 13,
                  background: "var(--vsc-bg-input)",
                  border: "1px solid var(--acc-blue)",
                  borderRadius: 4,
                  padding: "1px 4px",
                  color: "var(--vsc-fg-strong)",
                  outline: "none",
                  fontFamily: "var(--font-family)",
                }}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setActiveTabId(tab.id);
                  setRenamingTabId(tab.id);
                }}
              >
                {tab.label.replace(/\.sql$/i, "")}
              </span>
            )}
            {!isRenaming &&
              (isDirty ? (
                <span className="dirty" />
              ) : (
                <span className="x" onClick={(e) => closeTab(tab.id, e)}>
                  <X size={12} />
                </span>
              ))}
          </div>
        );
      })}
      <ToolButton iconOnly onClick={addTab} title="New tab">
        <Plus size={15} />
      </ToolButton>
      <div style={{ flex: 1 }} />
      <ToolButton
        iconOnly
        onClick={saveActiveTab}
        disabled={!activeSql.trim() || saving}
        title={activeTab?.savedId ? "Update saved query" : "Save query (uses the tab name)"}
      >
        <Save size={14} />
      </ToolButton>
      <ToolButton
        iconOnly
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Collapse editor" : "Expand editor"}
      >
        {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </ToolButton>
      {loading ? (
        <ToolButton
          onClick={cancelQuery}
          title="Cancel the running query"
          style={{ margin: "0 4px", color: "var(--om-fg-bright)" }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1,
              color: "var(--om-green)",
            }}
          >
            {runSpinner}
          </span>
          <Square size={11} fill="var(--om-red)" color="var(--om-red)" />
          Stop
        </ToolButton>
      ) : (
        <ToolButton
          onClick={() => runQuery()}
          title="Run (⌘⏎)"
          style={{ margin: "0 4px", color: "var(--om-fg-bright)" }}
        >
          <Play size={13} fill="var(--om-green)" color="var(--om-green)" />
          Run
        </ToolButton>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%", minWidth: 0, gap: 10 }}>
      {/* ── Columna izquierda: pestañas, editor y resultados ── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 10 }}>
        {/* ── Editor ───────────────────────────────────── */}
        <div className="tile" style={{ flexShrink: 0 }}>
          {tabsBar}
          <div style={{ height: editorH, overflow: "hidden" }}>
            <CodeMirror
              key={activeTabId}
              value={activeSql}
              onChange={setSql}
              theme={editorTheme}
              extensions={extensions}
              height={`${editorH}px`}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLineGutter: false,
              }}
              style={{ fontSize: 13, height: "100%" }}
            />
          </div>
        </div>

        {/* ── Resultados ───────────────────────────────── */}
        <div className="tile" style={{ flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "var(--vsc-bg-panel)",
            }}
          >
            {loading ? (
              <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
                <Spinner />
              </div>
            ) : activeError ? (
              <div style={{ margin: 12 }}>
                <Alert tone="error">{activeError}</Alert>
              </div>
            ) : activeResult ? (
              <QueryResultView
                result={activeResult}
                projectId={projectId}
                schema={activeTab?.schema}
                tableName={activeTab?.tableName}
                readOnly={readOnly}
                onApplied={() => runQueryRef.current?.(undefined, activeTabId)}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 8,
                  color: "var(--vsc-fg-muted)",
                  fontSize: 13,
                  padding: 32,
                }}
              >
                <Terminal size={32} style={{ opacity: 0.3 }} />
                <span>Write a query and press Run</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showInspector && <QueryInspector data={activeInspector} project={project} tables={tables} />}
    </div>
  );
};
