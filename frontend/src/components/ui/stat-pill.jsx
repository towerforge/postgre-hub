import styles from "@/css/ui/stat-pill.module.css";

/** Pastilla de dato: etiqueta y valor. `valueColor` tiñe solo el valor. */
export const StatPill = ({ label, value, valueColor, className = "", style }) => {
  return (
    <div className={`${styles.root} ${className}`} style={style}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
};
