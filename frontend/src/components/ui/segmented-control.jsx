import styles from "@/css/ui/segmented-control.module.css";

/** Grupo de botones excluyentes. `options` es una lista de `{ value, label }`. */
export const SegmentedControl = ({ options, value, onChange, className = "", style }) => {
  return (
    <div className={`${styles.root} ${className}`} style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.item} ${opt.value === value ? styles.itemActive : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
