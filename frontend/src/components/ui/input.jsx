// Campo de texto del kit: etiqueta, icono a cada lado, pista y mensaje de
// error debajo. El resto de props van tal cual al <input>, así que se usa como
// uno nativo (controlado o no). Es la base de PasswordInput.
import { AlertCircle } from "lucide-react";
import styles from "@/css/ui/input.module.css";

const SIZES = ["lg", "xl"];

/**
 * `error` sustituye a `hint` y pinta el borde en rojo. `size`: lg 32px
 * (por defecto) o xl 38px; mide lo mismo que un Button del mismo tamaño.
 */
export const Input = ({
  label,
  hint,
  error,
  iconLeft,
  iconRight,
  size = "lg",
  disabled,
  required,
  id,
  className = "",
  ...props
}) => {
  const wrapperClass = [
    styles.wrapper,
    styles[SIZES.includes(size) ? size : "lg"],
    disabled ? styles.disabled : "",
    error ? styles.error : "",
  ].join(" ");

  return (
    <div className={wrapperClass}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div className={styles.control}>
        {iconLeft && <span className={styles.iconLeft}>{iconLeft}</span>}
        <input
          id={id}
          disabled={disabled}
          required={required}
          className={`${styles.input} ${className}`}
          {...props}
        />
        {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
      </div>

      {error && (
        <span className={`${styles.message} ${styles.errorMsg}`}>
          <AlertCircle size={12} className={styles.messageIcon} />
          {error}
        </span>
      )}

      {hint && !error && <span className={`${styles.message} ${styles.hint}`}>{hint}</span>}
    </div>
  );
};
