import styles from "@/css/ui/switch.module.css";

/** Interruptor controlado (`checked` + `onChange(next)`), operable con teclado. */
export const Switch = ({ checked, onChange, label, disabled }) => {
  return (
    <div
      className={`${styles.root} ${disabled ? styles.disabled : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) onChange(!checked);
      }}
    >
      <div className={`${styles.track} ${checked ? styles.on : ""}`}>
        <div className={styles.thumb} />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
};
