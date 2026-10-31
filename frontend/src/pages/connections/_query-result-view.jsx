// Rejilla del resultado de una consulta en el editor SQL (/connections/:id):
// selección de celdas y filas, columnas redimensionables, exportar a CSV o
// JSON y, si la pestaña es de una tabla, edición en la propia rejilla con
// inserciones, cambios y borrados pendientes que se aplican de una vez. El
// estado de la rejilla vive aquí; el teclado y el portapapeles están en
// `_use-grid-keyboard`, y el modal de aplicar y la ventana del valor completo
// en sus piezas de al lado.
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Download, Plus } from "lucide-react";
import { ToolButton, Badge } from "@/components/ui";
import { apiRunQuery, apiBuildChanges } from "@/services/connections";
import { excelCol } from "./_query-utils";
import { downloadResult } from "./_result-export";
import { useGridKeyboard } from "./_use-grid-keyboard";
import { CellPopover } from "./_cell-popover";
import { ApplyChangesModal } from "./_apply-changes-modal";

/**
 * Rejilla del resultado de una consulta. Solo es editable si la pestaña es de
 * una tabla (`schema` y `tableName`) y la conexión no es de solo lectura;
 * `onApplied` vuelve a ejecutar la consulta tras aplicar los cambios.
 */
export const QueryResultView = ({
  result,
  projectId,
  schema,
  tableName,
  readOnly = false,
  onApplied,
}) => {
  const editable = !!(projectId && schema && tableName) && !readOnly;
  // Selección: celda ancla (ar, ac) y rango (r0, c0)–(r1, c1), todo en índices.
  const [sel, setSel] = useState(null);
  const draggingRef = useRef(false);
  // Anchos de columna en px; null mientras no se ha redimensionado ninguna.
  const [widths, setWidths] = useState(null);
  const thRefs = useRef([]);
  const resizingRef = useRef(null);
  // Celda abierta en la ventana flotante: `{ text, top, left, minWidth }`.
  const [expand, setExpand] = useState(null);
  // Cambios pendientes: ediciones por "fila:columna", índices de filas a borrar
  // y filas nuevas (cada una, un Map de columna a texto).
  const [edits, setEdits] = useState(new Map());
  const [deletes, setDeletes] = useState(new Set());
  const [inserts, setInserts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [builtSQL, setBuiltSQL] = useState(null);
  // Selección en la que se está escribiendo: si cambia, la tecla siguiente
  // sustituye el valor en vez de añadirse.
  const typingSelRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setEdits(new Map());
    setDeletes(new Set());
    setInserts([]);
    typingSelRef.current = null;
  }, [result]);

  useGridKeyboard({
    editable,
    result,
    sel,
    setSel,
    edits,
    setEdits,
    deletes,
    setDeletes,
    inserts,
    setInserts,
    typingSelRef,
    wrapRef,
  });

  useEffect(() => {
    if (!expand) return;
    const close = () => setExpand(null);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [expand]);

  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
      resizingRef.current = null;
    };
    const move = (e) => {
      const r = resizingRef.current;
      if (!r) return;
      const newW = Math.max(40, r.startW + (e.clientX - r.startX));
      setWidths((ws) => (ws ? ws.map((w, i) => (i === r.ci ? newW : w)) : ws));
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  useEffect(() => {
    setWidths(null);
  }, [result]);

  if (result.affected !== undefined) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "var(--text-2)", fontFamily: "monospace" }}>
        ✓ Query executed — <strong style={{ color: "var(--text-1)" }}>{result.affected}</strong>{" "}
        rows affected.
      </div>
    );
  }
  const cols = result.columns;
  const lastCol = cols.length - 1;

  const startCell = (r, c) => {
    draggingRef.current = true;
    wrapRef.current?.focus();
    setSel({ ar: r, ac: c, r0: r, c0: c, r1: r, c1: c });
  };
  const extendCell = (r, c) => {
    if (!draggingRef.current) return;
    setSel(
      (s) =>
        s && {
          ar: s.ar,
          ac: s.ac,
          r0: Math.min(s.ar, r),
          c0: Math.min(s.ac, c),
          r1: Math.max(s.ar, r),
          c1: Math.max(s.ac, c),
        },
    );
  };
  const startRow = (r) => {
    draggingRef.current = true;
    wrapRef.current?.focus();
    setSel({ ar: r, ac: 0, r0: r, c0: 0, r1: r, c1: lastCol });
  };
  const extendRow = (r) => {
    if (!draggingRef.current) return;
    setSel(
      (s) =>
        s && {
          ar: s.ar,
          ac: s.ac,
          r0: Math.min(s.ar, r),
          c0: 0,
          r1: Math.max(s.ar, r),
          c1: lastCol,
        },
    );
  };

  const startResize = (ci, e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = widths ?? cols.map((_, i) => thRefs.current[i]?.offsetWidth ?? 120);
    if (!widths) setWidths(current);
    resizingRef.current = { ci, startX: e.clientX, startW: current[ci] };
  };

  const selLabel = sel
    ? sel.r0 === sel.r1 && sel.c0 === sel.c1
      ? `${excelCol(sel.c0)}${sel.r0 + 1}`
      : `${excelCol(sel.c0)}${sel.r0 + 1}:${excelCol(sel.c1)}${sel.r1 + 1}`
    : "";
  const isRange = !!sel && (sel.r0 !== sel.r1 || sel.c0 !== sel.c1);

  const rowWhereCells = (ri) =>
    result.rows[ri].map((val, ci) => ({
      name: cols[ci].name,
      type: cols[ci].type,
      value: val === null || val === undefined ? null : String(val),
    }));

  const buildPendingPayload = () => {
    const byRow = new Map();
    for (const [k, raw] of edits) {
      const [r, c] = k.split(":").map(Number);
      if (deletes.has(r)) continue;
      const list = byRow.get(r) ?? [];
      list.push({ ci: c, raw });
      byRow.set(r, list);
    }
    const updates = [...byRow.keys()]
      .sort((a, b) => a - b)
      .map((ri) => ({
        set: byRow.get(ri).map(({ ci, raw }) => ({
          name: cols[ci].name,
          type: cols[ci].type,
          raw,
        })),
        where: rowWhereCells(ri),
      }));
    const deleteRows = [...deletes]
      .sort((a, b) => a - b)
      .map((ri) => ({
        where: rowWhereCells(ri),
      }));
    const insertRows = inserts.map((map) => ({
      values: [...map.entries()]
        .sort(([a], [b]) => a - b)
        .map(([ci, raw]) => ({
          name: cols[ci].name,
          type: cols[ci].type,
          raw,
        })),
    }));
    return { inserts: insertRows, updates, deletes: deleteRows };
  };

  const pendingCount = edits.size + deletes.size + inserts.length;

  const addInsertRow = () => {
    const newIdx = result.rows.length + inserts.length;
    setInserts((arr) => [...arr, new Map()]);
    setSel({ ar: newIdx, ac: 0, r0: newIdx, c0: 0, r1: newIdx, c1: 0 });
    wrapRef.current?.focus();
  };

  const openApplyModal = async () => {
    if (!projectId || !schema || !tableName) return;
    setApplyError(null);
    setBuiltSQL(null);
    setModalOpen(true);
    try {
      const { sql } = await apiBuildChanges(projectId, {
        schema,
        table: tableName,
        ...buildPendingPayload(),
      });
      setBuiltSQL(sql);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Failed to build SQL");
    }
  };

  const handleExecute = async () => {
    if (!projectId || !builtSQL) return;
    setApplying(true);
    setApplyError(null);
    try {
      await apiRunQuery(projectId, builtSQL);
      setEdits(new Map());
      setDeletes(new Set());
      setInserts([]);
      setModalOpen(false);
      onApplied?.();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, outline: "none" }}
      tabIndex={-1}
    >
      <div className="dt-wrap">
        <table
          className="dt"
          style={{
            userSelect: sel ? "none" : undefined,
            tableLayout: widths ? "fixed" : undefined,
          }}
        >
          {widths && (
            <colgroup>
              <col style={{ width: 38 }} />
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
          )}
          <thead>
            <tr>
              <th className="row-num">#</th>
              {cols.map((c, i) => (
                <th
                  key={`${c.name}-${i}`}
                  ref={(el) => {
                    thRefs.current[i] = el;
                  }}
                  style={{ position: "sticky" }}
                >
                  <span className="col-name">{c.name}</span>
                  <span style={{ color: "var(--om-fg-muted)", fontWeight: 400, marginLeft: 6 }}>
                    {excelCol(i)}
                  </span>
                  <div
                    onMouseDown={(e) => startResize(i, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setWidths(null);
                    }}
                    title="Drag to resize · double-click to reset"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: 6,
                      cursor: "col-resize",
                      userSelect: "none",
                      zIndex: 3,
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 && inserts.length === 0 && (
              <tr>
                <td className="row-num" />
                <td
                  colSpan={cols.length}
                  style={{
                    textAlign: "center",
                    color: "var(--text-3)",
                    fontSize: 12,
                    padding: "24px 0",
                  }}
                >
                  No rows returned.
                </td>
              </tr>
            )}
            {result.rows.map((row, ri) => {
              const inRow = !!sel && ri >= sel.r0 && ri <= sel.r1;
              const isDeleted = deletes.has(ri);
              return (
                <tr key={`r${ri}`}>
                  <td
                    className={`row-num${inRow ? " sel" : ""}${isDeleted ? " cell-deleted" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startRow(ri);
                    }}
                    onMouseEnter={() => extendRow(ri)}
                  >
                    {ri + 1}
                  </td>
                  {row.map((cell, ci) => {
                    const inSel =
                      !!sel && ri >= sel.r0 && ri <= sel.r1 && ci >= sel.c0 && ci <= sel.c1;
                    const editKey = `${ri}:${ci}`;
                    const editVal = edits.get(editKey);
                    const isEdited = editVal !== undefined;
                    const display = isEdited
                      ? editVal.toLowerCase() === "null"
                        ? null
                        : editVal
                      : cell;
                    const cls = [
                      display === null && "null-cell",
                      inSel && "cell-sel",
                      isDeleted ? "cell-deleted" : isEdited && "cell-edited",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td
                        key={ci}
                        className={cls}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startCell(ri, ci);
                        }}
                        onMouseEnter={() => extendCell(ri, ci)}
                        onClick={(e) => {
                          const el = e.currentTarget;
                          if (display === null || el.scrollWidth <= el.clientWidth + 1) {
                            setExpand(null);
                            return;
                          }
                          const r = el.getBoundingClientRect();
                          setExpand({
                            text: String(display),
                            top: r.top,
                            left: r.left,
                            minWidth: r.width,
                          });
                        }}
                      >
                        {display === null ? (
                          "null"
                        ) : typeof display === "boolean" ? (
                          <span style={{ color: "var(--om-orange)" }}>{String(display)}</span>
                        ) : typeof display === "number" ? (
                          <span style={{ color: "var(--color-info)" }}>{String(display)}</span>
                        ) : (
                          String(display)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {inserts.map((entry, ii) => {
              const ri = result.rows.length + ii;
              const inRow = !!sel && ri >= sel.r0 && ri <= sel.r1;
              return (
                <tr key={`+${ii}`}>
                  <td
                    className={`row-num cell-inserted${inRow ? " sel" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      startRow(ri);
                    }}
                    onMouseEnter={() => extendRow(ri)}
                    title="New row (pending insert)"
                  >
                    +{ii + 1}
                  </td>
                  {cols.map((_, ci) => {
                    const inSel =
                      !!sel && ri >= sel.r0 && ri <= sel.r1 && ci >= sel.c0 && ci <= sel.c1;
                    const v = entry.get(ci);
                    const isSet = v !== undefined;
                    const display = isSet ? (v.toLowerCase() === "null" ? null : v) : null;
                    const cls = [
                      "cell-inserted",
                      (!isSet || display === null) && "null-cell",
                      inSel && "cell-sel",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td
                        key={ci}
                        className={cls}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          startCell(ri, ci);
                        }}
                        onMouseEnter={() => extendCell(ri, ci)}
                      >
                        {!isSet ? (
                          <span style={{ opacity: 0.5 }}>default</span>
                        ) : display === null ? (
                          "null"
                        ) : typeof display === "number" ? (
                          <span style={{ color: "var(--color-info)" }}>{String(display)}</span>
                        ) : (
                          String(display)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          height: 40,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 12px 0 16px",
          borderTop: "1px solid var(--om-border)",
          background: "var(--om-bg)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        <span style={{ color: "var(--om-fg-muted)" }}>
          <span style={{ opacity: 0.7 }}>rows </span>
          <span style={{ color: "var(--om-fg)" }}>{result.total ?? result.rows.length}</span>
        </span>
        {result.duration_ms !== undefined && (
          <span style={{ color: "var(--om-fg-muted)" }}>
            <span style={{ opacity: 0.7 }}>time </span>
            <span style={{ color: "var(--om-green)" }}>
              {(result.duration_ms / 1000).toFixed(2)}s
            </span>
          </span>
        )}
        <span style={{ color: sel ? "var(--om-green)" : "var(--om-fg-muted)" }}>
          {selLabel || "—"}
        </span>
        {isRange && sel && (
          <span style={{ color: "var(--om-fg-muted)" }}>
            {sel.r1 - sel.r0 + 1}R × {sel.c1 - sel.c0 + 1}C
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {pendingCount > 0 && (
            <span style={{ color: "var(--om-fg-muted)", marginRight: 12 }}>
              {[
                inserts.length > 0 && `${inserts.length} insert${inserts.length === 1 ? "" : "s"}`,
                edits.size > 0 && `${edits.size} edit${edits.size === 1 ? "" : "s"}`,
                deletes.size > 0 && `${deletes.size} delete${deletes.size === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          {result.columns.length > 0 && (
            <>
              <ToolButton
                onClick={() => downloadResult(result, "csv", tableName)}
                title="Download all rows as CSV"
              >
                <Download size={13} />
                CSV
              </ToolButton>
              <ToolButton
                onClick={() => downloadResult(result, "json", tableName)}
                title="Download all rows as JSON"
              >
                <Download size={13} />
                JSON
              </ToolButton>
              <span
                style={{
                  width: 1,
                  height: 16,
                  background: "var(--om-border-focus)",
                  margin: "0 4px",
                }}
              />
            </>
          )}
          {editable && (
            <>
              <ToolButton onClick={addInsertRow} title="Add a new empty row">
                <Plus size={13} />
                Add row
              </ToolButton>
              <span
                style={{
                  width: 1,
                  height: 16,
                  background: "var(--om-border-focus)",
                  margin: "0 4px",
                }}
              />
            </>
          )}
          {/* Apply solo destaca (azul + contador) cuando hay cambios pendientes */}
          <ToolButton
            disabled={pendingCount === 0}
            onClick={openApplyModal}
            title={
              readOnly
                ? "This connection is read-only"
                : !editable
                  ? "Editing requires opening a table from the sidebar"
                  : "Preview and apply pending changes"
            }
            style={pendingCount > 0 ? { color: "var(--om-accent)", fontWeight: 600 } : undefined}
          >
            <ArrowUp size={13} />
            Apply
            {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
          </ToolButton>
        </div>
      </div>
      {expand && <CellPopover popover={expand} />}
      <ApplyChangesModal
        open={modalOpen}
        sql={builtSQL}
        error={applyError}
        applying={applying}
        onClose={() => setModalOpen(false)}
        onExecute={handleExecute}
      />
    </div>
  );
};
