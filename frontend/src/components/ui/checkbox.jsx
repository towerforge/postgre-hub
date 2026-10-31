import { Check } from "lucide-react";
import styles from "@/css/ui/checkbox.module.css";

/** Casilla controlada (`checked` + `onChange(next)`), operable con teclado. `description` es el texto secundario bajo la etiqueta. */
export const Checkbox = ({ checked, onChange, label, description, disabled }) => {
  return (
    <div
      className={`${styles.root} ${description ? styles.withDescription : ""} ${disabled ? styles.disabled : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className={`${styles.box} ${checked ? styles.checked : ""}`}>
        <span className={styles.tick}>
          <Check size={9} strokeWidth={3} />
        </span>
      </div>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
    </div>
  );
};
