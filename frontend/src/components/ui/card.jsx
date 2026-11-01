// Tarjeta del kit con cabecera, cuerpo y pie opcionales.
import styles from "@/css/ui/card.module.css";

// Variantes numeradas por prominencia (de más a menos destacada):
//   1 elevated  — sin borde, con sombra de popover
//   2 panel     — la superficie estándar (--panel-radius, squircle), como las filas de conexiones
//   3 default   — capa 1 con borde y radio pequeño (la de siempre, por defecto)
//   4 filled    — capa 2 rellena, sin borde ni sombra
//   5 outlined  — transparente, solo borde
const VARIANT_CLASS = {
  1: styles.elevated,
  2: styles.panel,
  3: "",
  4: styles.filled,
  5: styles.outlined,
};

/**
 * Tarjeta contenedora. `variant` 1–5 (ver lista arriba; por defecto 3). `interactive`
 * añade hover y pulsación; `as` cambia la etiqueta raíz.
 */
export const Card = ({
  variant = 3,
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...props
}) => {
  const variantClass = VARIANT_CLASS[variant] ?? "";
  return (
    <Tag
      className={`${styles.card} ${variantClass} ${interactive ? styles.interactive : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

/** Cabecera de la tarjeta: `title` como rótulo (si no, los `children`) y `actions` a la derecha. */
export const CardHeader = ({ title, actions, className = "", children, ...props }) => {
  return (
    <div className={`${styles.header} ${className}`} {...props}>
      {title ? <span className={styles.title}>{title}</span> : children}
      {actions && <div>{actions}</div>}
    </div>
  );
};

export const CardBody = ({ className = "", ...props }) => {
  return <div className={`${styles.body} ${className}`} {...props} />;
};

export const CardFooter = ({ className = "", ...props }) => {
  return <div className={`${styles.footer} ${className}`} {...props} />;
};
