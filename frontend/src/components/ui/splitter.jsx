/**
 * Separador arrastrable que ocupa el hueco entre dos islas. `orientation`
 * "vertical" separa columnas (se arrastra en horizontal) y "horizontal" separa
 * filas. `dragging` y `handleProps` salen de `useResizable`. Los estilos son las
 * clases globales `.splitter` de `index.css`.
 */
export const Splitter = ({ orientation, dragging, handleProps, style }) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      title="Drag to resize · double-click to reset"
      className={`splitter ${orientation}${dragging ? " dragging" : ""}`}
      style={style}
      {...handleProps}
    />
  );
};
