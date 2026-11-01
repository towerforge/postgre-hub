// Inspector del editor SQL: datos de la conexión, estadísticas de la última
// consulta, tablas afectadas y columnas del resultado. Vive en la barra
// lateral derecha de la aplicación, que es de otro componente, por eso se
// monta por portal. Es una pieza de /connections/:id.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Table2, ChevronDown } from "lucide-react";
import { Splitter, Button, useResizable } from "@/components/ui";
import { excelCol, fmtRows, fmtSize } from "./_query-utils";

const INSPECTOR_TABS = ["info", "attrs"];

// Bloque con título dentro del inspector.
const InspectorSection = ({ title, children }) => (
  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--stroke-1)" }}>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-1)",
        marginBottom: 8,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

/**
 * Panel derecho del editor (se pinta por portal en `#right-sidebar-slot`).
 * `data` son las estadísticas de la última consulta o null:
 * `{ database, duration, rows, total?, tables, columns? }`.
 */
export const QueryInspector = ({ data, project, tables }) => {
  const [tab, setTab] = useState("info");
  const panel = useResizable({
    key: "inspector",
    initial: 260,
    min: 200,
    max: 560,
    axis: "x",
    invert: true,
  });

  const [slot, setSlot] = useState(null);
  useEffect(() => {
    setSlot(document.getElementById("right-sidebar-slot"));
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const tableByName = new Map();
  for (const t of tables) {
    tableByName.set(`${t.schema}.${t.name}`, t);
    tableByName.set(t.name, t);
  }

  if (!slot) return null;

  return createPortal(
    <>
      <Splitter
        orientation="vertical"
        dragging={panel.dragging}
        handleProps={panel.handleProps}
        style={{ marginLeft: -10 }}
      />
      <div className="tile" style={{ width: panel.size, flexShrink: 0 }}>
        <div className="tile-head">
          <span className="name">Inspector</span>
          <div ref={menuRef} style={{ marginLeft: "auto", position: "relative" }}>
            <Button variant={7} active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              {tab}
              <ChevronDown size={13} />
            </Button>
            {menuOpen && (
              <div className="pos-menu">
                {INSPECTOR_TABS.map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => {
                      setTab(t);
                      setMenuOpen(false);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {tab === "info" && (
            <>
              <InspectorSection title="Connection">
                <div className="kv">
                  <span className="k">Name</span>
                  <span className="v">{project?.name ?? "—"}</span>
                  <span className="k">Host</span>
                  <span className="v" style={{ wordBreak: "break-all" }}>
                    {project?.host ?? "—"}
                  </span>
                  <span className="k">Port</span>
                  <span className="v">{project?.port ?? "—"}</span>
                  <span className="k">Database</span>
                  <span className="v">{project?.database ?? "—"}</span>
                  <span className="k">User</span>
                  <span className="v">{project?.username ?? "—"}</span>
                </div>
              </InspectorSection>

              {data ? (
                <InspectorSection title="Query stats">
                  <div className="kv">
                    <span className="k">Duration</span>
                    <span className="v">{data.duration} ms</span>
                    <span className="k">Rows</span>
                    <span className="v">{data.rows.toLocaleString()} fetched</span>
                    {data.total !== undefined && data.total !== data.rows && (
                      <>
                        <span className="k">Total</span>
                        <span className="v">{data.total.toLocaleString()}</span>
                      </>
                    )}
                    <span className="k">Isolation</span>
                    <span className="v" style={{ color: "var(--text-3)" }}>
                      read committed
                    </span>
                  </div>
                </InspectorSection>
              ) : (
                <div style={{ padding: "14px 12px", fontSize: 11.5, color: "var(--text-3)" }}>
                  Run a query to see stats.
                </div>
              )}

              {data && data.tables.length > 0 && (
                <InspectorSection title="Affected tables">
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {data.tables.map((t) => {
                      const info = tableByName.get(t);
                      const label = info ? `${info.schema}.${info.name}` : t;
                      const badge = info ? fmtRows(info.row_count) || fmtSize(info.size_bytes) : "";
                      return (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Table2 size={11} style={{ flexShrink: 0, color: "var(--accent)" }} />
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--text-1)",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {label}
                          </span>
                          {badge && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--text-3)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </InspectorSection>
              )}
            </>
          )}

          {tab === "attrs" && (
            <div style={{ padding: "14px 12px" }}>
              {data && data.columns && data.columns.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {data.columns.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        padding: "3px 0",
                        borderBottom:
                          i < data.columns.length - 1 ? "0.5px solid var(--stroke-1)" : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                          minWidth: 14,
                          textAlign: "left",
                        }}
                      >
                        {excelCol(i)}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-1)",
                          fontFamily: "var(--font-mono)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.type.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                  Run a query to see column attributes.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    slot,
  );
};
