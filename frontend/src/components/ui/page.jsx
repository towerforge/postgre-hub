const PADDING = {
  1: "12px 16px",
  2: "24px 20px",
  3: "40px 32px",
  4: "64px 48px",
};

/** Contenedor de página centrado. `size` (1–4) es el relleno; `maxWidth` acepta px o "full" para ocupar todo el ancho. */
export const Page = ({ children, maxWidth = 960, size = 2 }) => {
  const style = {
    padding: PADDING[size],
    ...(maxWidth !== "full" && { maxWidth, margin: "0 auto" }),
  };
  return <div style={style}>{children}</div>;
};
