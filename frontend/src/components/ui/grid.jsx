import styles from "@/css/ui/grid.module.css";

/** Rejilla de 12 columnas. `align` es el `align-items` de las celdas (start, center, end, stretch). */
export const Grid = ({ children, gap = 12, align = "end", style }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap,
        alignItems: align,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Celda de `Grid`. `span` son las columnas (1–12) en móvil; `sm`, `md` y `lg` las sustituyen a partir de 480, 768 y 1024 px. */
export const Col = ({ children, span = 12, sm, md, lg, style }) => {
  const cls = [
    styles[`span-${span}`],
    sm && styles[`sm-${sm}`],
    md && styles[`md-${md}`],
    lg && styles[`lg-${lg}`],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls || undefined} style={style}>
      {children}
    </div>
  );
};
