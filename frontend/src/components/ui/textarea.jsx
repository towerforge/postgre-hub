import styles from "@/css/ui/textarea.module.css";

/** Campo de texto multilínea con el mismo aspecto que `Input`. `mono` lo pone en monoespaciada (SQL, JSON…). */
export const Textarea = ({ label, mono = false, id, className = "", ...props }) => {
  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`${styles.textarea} ${mono ? styles.mono : ""} ${className}`}
        {...props}
      />
    </div>
  );
};
