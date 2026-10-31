// Teclado y portapapeles de la rejilla de resultados: escribir en las celdas,
// borrar, descartar con Esc, marcar filas para borrar, copiar como TSV y pegar
// desde una hoja de cálculo. Está aparte de `_query-result-view.jsx` para que
// la rejilla no pase de tamaño; el estado sigue siendo de la rejilla y llega
// aquí junto con sus setters.
import { useEffect } from "react";

/**
 * Engancha los manejadores de teclado, copiar y pegar al documento mientras
 * hay selección. Las ediciones se guardan como texto; la palabra "null" se
 * interpreta como NULL al copiar y al generar el SQL. Los setters y las refs
 * que llegan son estables, así que en las dependencias no provocan repeticiones.
 */
export const useGridKeyboard = ({
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
}) => {
  useEffect(() => {
    if (!editable || !sel) return;
    const nReal = result.rows.length;
    const writeCells = (cells, fn) => {
      const realCells = cells.filter((c) => c.ri < nReal);
      const phantomCells = cells.filter((c) => c.ri >= nReal);
      if (realCells.length) {
        setEdits((m) => {
          const n = new Map(m);
          realCells.forEach((c) => n.set(c.k, fn(n.get(c.k))));
          return n;
        });
      }
      if (phantomCells.length) {
        setInserts((arr) => {
          const next = arr.slice();
          phantomCells.forEach((c) => {
            const idx = c.ri - nReal;
            if (idx < 0 || idx >= next.length) return;
            const map = new Map(next[idx]);
            map.set(c.ci, fn(map.get(c.ci)));
            next[idx] = map;
          });
          return next;
        });
      }
    };
    const onKey = (e) => {
      const t = e.target;
      if (t && t.tagName !== "BODY" && !wrapRef.current?.contains(t)) return;

      const cells = [];
      for (let r = sel.r0; r <= sel.r1; r++)
        for (let c = sel.c0; c <= sel.c1; c++) cells.push({ k: `${r}:${c}`, ri: r, ci: c });
      const selKey = `${sel.r0}:${sel.c0}:${sel.r1}:${sel.c1}`;
      const isFullRowSel = sel.c0 === 0 && sel.c1 === result.columns.length - 1;
      const allPhantom = sel.r0 >= nReal;
      const allReal = sel.r1 < nReal;

      if (e.key === "Escape") {
        setEdits((m) => {
          const n = new Map(m);
          cells.filter((c) => c.ri < nReal).forEach((c) => n.delete(c.k));
          return n;
        });
        setInserts((arr) => {
          const next = arr.slice();
          cells
            .filter((c) => c.ri >= nReal)
            .forEach((c) => {
              const idx = c.ri - nReal;
              if (idx < 0 || idx >= next.length) return;
              const map = new Map(next[idx]);
              map.delete(c.ci);
              next[idx] = map;
            });
          return next;
        });
        if (isFullRowSel && allReal) {
          setDeletes((s) => {
            const n = new Set(s);
            for (let r = sel.r0; r <= sel.r1; r++) n.delete(r);
            return n;
          });
        }
        typingSelRef.current = null;
        e.preventDefault();
        return;
      }
      // Suprimir o `-` con filas enteras seleccionadas: marca para borrar las filas
      // reales y quita las nuevas (aún sin insertar).
      if ((e.key === "Delete" || e.key === "-") && isFullRowSel) {
        if (allPhantom) {
          const phantomIdxs = [];
          for (let r = sel.r0; r <= sel.r1; r++) phantomIdxs.push(r - nReal);
          setInserts((arr) => arr.filter((_, i) => !phantomIdxs.includes(i)));
          setSel(null);
          typingSelRef.current = null;
          e.preventDefault();
          return;
        }
        if (allReal) {
          const rowRange = [];
          for (let r = sel.r0; r <= sel.r1; r++) rowRange.push(r);
          const allMarked = rowRange.every((r) => deletes.has(r));
          setDeletes((s) => {
            const n = new Set(s);
            if (allMarked) rowRange.forEach((r) => n.delete(r));
            else rowRange.forEach((r) => n.add(r));
            return n;
          });
          if (!allMarked) {
            setEdits((m) => {
              const n = new Map(m);
              for (const k of Array.from(n.keys())) {
                const r = Number(k.split(":")[0]);
                if (r >= sel.r0 && r <= sel.r1) n.delete(k);
              }
              return n;
            });
            typingSelRef.current = null;
          }
          e.preventDefault();
          return;
        }
        // Selección mixta (filas reales y nuevas): no se hace nada.
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        writeCells(cells, (prev) => (e.key === "Delete" ? "" : (prev ?? "").slice(0, -1)));
        typingSelRef.current = selKey;
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const fresh = typingSelRef.current !== selKey;
        typingSelRef.current = selKey;
        writeCells(cells, (prev) => (fresh ? e.key : (prev ?? "") + e.key));
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    editable,
    sel,
    deletes,
    inserts,
    result,
    setSel,
    setEdits,
    setDeletes,
    setInserts,
    typingSelRef,
    wrapRef,
  ]);

  // Copia la selección al portapapeles como TSV (en cualquier resultado, editable o no).
  useEffect(() => {
    if (!sel) return;
    const nReal = result.rows.length;
    const onCopy = (e) => {
      const t = e.target;
      if (t && t.tagName !== "BODY" && !wrapRef.current?.contains(t)) return;
      const lines = [];
      for (let r = sel.r0; r <= sel.r1; r++) {
        const cells = [];
        for (let c = sel.c0; c <= sel.c1; c++) {
          let raw;
          if (r < nReal) {
            const editVal = edits.get(`${r}:${c}`);
            raw =
              editVal !== undefined
                ? editVal.toLowerCase() === "null"
                  ? null
                  : editVal
                : result.rows[r][c];
          } else {
            const v = inserts[r - nReal]?.get(c);
            raw = v === undefined ? "" : v.toLowerCase() === "null" ? null : v;
          }
          cells.push(raw === null || raw === undefined ? "" : String(raw));
        }
        lines.push(cells.join("\t"));
      }
      e.clipboardData?.setData("text/plain", lines.join("\n"));
      e.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [sel, edits, inserts, result, wrapRef]);

  // Pega TSV en la selección: un valor suelto rellena toda la selección y un
  // bloque se reparte desde la celda superior izquierda.
  useEffect(() => {
    if (!editable || !sel) return;
    const nReal = result.rows.length;
    const totalRows = nReal + inserts.length;
    const onPaste = (e) => {
      const t = e.target;
      if (t && t.tagName !== "BODY" && !wrapRef.current?.contains(t)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;
      e.preventDefault();

      const grid = text
        .replace(/\r\n/g, "\n")
        .replace(/\n$/, "")
        .split("\n")
        .map((l) => l.split("\t"));
      const pr = grid.length;
      const pc = grid[0]?.length ?? 0;
      if (pr === 0 || pc === 0) return;
      const fill = pr === 1 && pc === 1;
      const maxCols = result.columns.length;

      const writes = [];
      if (fill) {
        const v = grid[0][0];
        for (let r = sel.r0; r <= sel.r1; r++)
          for (let c = sel.c0; c <= sel.c1; c++) writes.push({ ri: r, ci: c, v });
      } else {
        for (let r = 0; r < pr; r++) {
          const tr = sel.r0 + r;
          if (tr >= totalRows) break;
          for (let c = 0; c < pc; c++) {
            const tc = sel.c0 + c;
            if (tc >= maxCols) break;
            writes.push({ ri: tr, ci: tc, v: grid[r][c] });
          }
        }
      }

      const realWrites = writes.filter((w) => w.ri < nReal);
      const phantomWrites = writes.filter((w) => w.ri >= nReal);
      if (realWrites.length) {
        setEdits((m) => {
          const n = new Map(m);
          realWrites.forEach((w) => n.set(`${w.ri}:${w.ci}`, w.v));
          return n;
        });
      }
      if (phantomWrites.length) {
        setInserts((arr) => {
          const next = arr.slice();
          phantomWrites.forEach((w) => {
            const idx = w.ri - nReal;
            if (idx < 0 || idx >= next.length) return;
            const map = new Map(next[idx]);
            map.set(w.ci, w.v);
            next[idx] = map;
          });
          return next;
        });
      }
      typingSelRef.current = null;
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editable, sel, inserts, result, setEdits, setInserts, typingSelRef, wrapRef]);
};
