import styles from "@/css/ui/card.module.css";

/**
 * Tarjeta contenedora. `variant`: default, outlined, elevated, filled o panel (el
 * aspecto de las filas del listado de conexiones). `interactive` añade hover y
 * pulsación; `as` cambia la etiqueta raíz.
 */
export const Card = ({
  variant = "default",
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...props
}) => {
  const variantClass = variant !== "default" ? styles[variant] : "";
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
