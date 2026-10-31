// Ventana flotante con el valor completo de una celda que no cabe en su
// columna. Se pinta en `document.body` para que no la recorte el scroll de la
// tabla y no captura el ratón, así la selección sigue funcionando debajo. Es
// una pieza de la rejilla de resultados del editor SQL (/connections/:id).
import { createPortal } from "react-dom";

/** Valor completo de una celda; `popover` es `{ text, top, left, minWidth }`. */
export const CellPopover = ({ popover }) =>
  createPortal(
    <div
      style={{
        position: "fixed",
        top: popover.top,
        left: popover.left,
        minWidth: popover.minWidth,
        maxWidth: 600,
        maxHeight: 240,
        overflow: "auto",
        padding: "4px 12px",
        background: "var(--om-bg-2)",
        border: "1px solid var(--om-accent)",
        borderRadius: "var(--radius-2)",
        color: "var(--om-fg-bright)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {popover.text}
    </div>,
    document.body,
  );
