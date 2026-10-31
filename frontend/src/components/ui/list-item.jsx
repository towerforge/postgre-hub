// Fila de listado con fondo plano y borde fino: elemento a la izquierda,
// título y subtítulo, y acciones a la derecha. Con `onClick` se comporta como
// un botón (también con teclado); con `selected`, como opción de una lista de
// selección única. ListItemGroup las apila como un bloque.
import styles from "@/css/ui/list-item.module.css";

/**
 * `leading` es el elemento de la izquierda (avatar, icono…), `actions` lo de la
 * derecha, `selected` marca la opción elegida y `mono` (por defecto) pone el
 * subtítulo en monoespaciada para URI y rutas.
 */
export const ListItem = ({
  leading,
  title,
  subtitle,
  actions,
  onClick,
  selected,
  mono = true,
  onMouseEnter,
  onMouseLeave,
  className = "",
}) => {
  // Con onClick la fila se comporta como un botón, también con teclado
  const interactive = onClick
    ? {
        role: "button",
        tabIndex: 0,
        "aria-pressed": selected,
        onKeyDown: (e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <div
      className={`${styles.item} ${onClick ? styles.clickable : ""} ${selected ? styles.selected : ""} ${className}`}
      onClick={onClick}
      {...interactive}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {leading}
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {subtitle && (
          <div className={`${styles.subtitle} ${mono ? styles.mono : ""}`}>{subtitle}</div>
        )}
      </div>
      {actions}
    </div>
  );
};

export const ListItemGroup = ({ children }) => {
  return <div className={styles.group}>{children}</div>;
};
