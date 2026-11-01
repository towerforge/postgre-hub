// Control segmentado del kit: grupo de botones excluyentes con la altura de la
// escala de controles.
import styles from "@/css/ui/segmented-control.module.css";

const SIZES = ["lg", "xl"];

/**
 * Grupo de botones excluyentes. `options` es una lista de `{ value, label }`.
 * `size`: lg 32px (por defecto) o xl 38px de alto exterior.
 */
export const SegmentedControl = ({
  options,
  value,
  onChange,
  size = "lg",
  className = "",
  style,
}) => {
  return (
    <div
      className={`${styles.root} ${styles[SIZES.includes(size) ? size : "lg"]} ${className}`}
      style={style}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.item} ${opt.value === value ? styles.itemActive : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
