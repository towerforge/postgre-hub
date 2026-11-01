// Catálogo del kit (/dev), piezas de maquetación comunes: DevSection agrupa una
// familia de componentes y DevRow rotula cada fila de ejemplos. Así las
// secciones no repiten a mano títulos, márgenes ni estilos en línea.
import { Text } from "@/components/ui";
import css from "@/css/dev.module.css";

/** Sección del catálogo: título, descripción opcional y filas debajo. */
export const DevSection = ({ title, description, children }) => (
  <section className={css.section}>
    <Text variant="body" as="h2" className={css.heading}>
      {title}
    </Text>
    {description && (
      <Text variant="hint" className={css.description}>
        {description}
      </Text>
    )}
    {children}
  </section>
);

/** Fila rotulada: el rótulo encima y los ejemplos en línea, alineados al centro. */
export const DevRow = ({ label, children }) => (
  <div className={css.row}>
    {label && <span className={css.rowLabel}>{label}</span>}
    <div className={css.rowBody}>{children}</div>
  </div>
);
