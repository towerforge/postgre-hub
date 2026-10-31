import styles from "@/css/ui/tool-button.module.css";

/**
 * Botón ligero de barra de herramientas, cabeceras y filas de listado. `active`
 * marca el estado activo (panel visible, menú abierto…), `iconOnly` lo hace
 * cuadrado y atenuado, y `size="sm"` es el de la barra de estado.
 */
export const ToolButton = ({
  active = false,
  iconOnly = false,
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      className={`${styles.btn} ${iconOnly ? styles.iconOnly : ""} ${size === "sm" ? styles.sm : ""} ${active ? styles.active : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
