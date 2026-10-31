import styles from "@/css/ui/form-row.module.css";

/** Fila de formulario: etiqueta a la izquierda y control a la derecha. `labelWidth` es el ancho de la columna de la etiqueta en px. */
export const FormRow = ({ label, labelWidth = 120, className = "", children }) => {
  return (
    <div
      className={`${styles.row} ${className}`}
      style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}
    >
      <span className={styles.label}>{label}</span>
      <div className={styles.control}>{children}</div>
    </div>
  );
};
