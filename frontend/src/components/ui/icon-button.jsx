import styles from "@/css/ui/icon-button.module.css";

/** Botón cuadrado solo con icono (cerrar, info, salir…). `label` es el texto accesible y también el tooltip. */
export const IconButton = ({
  label,
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}) => {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={`${styles.btn} ${size === "sm" ? styles.sm : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
