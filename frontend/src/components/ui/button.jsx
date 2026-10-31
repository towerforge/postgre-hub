import styles from "@/css/ui/button.module.css";

const VARIANT_CLASS = {
  1: styles.primary,
  2: styles.secondary,
  3: styles.outline,
  4: styles.subtle,
  5: styles.danger,
  6: styles.destructive,
};

/**
 * Botón del kit. `variant` va numerada por prominencia: 1 primario, 2 secundario,
 * 3 contorno, 4 sutil, 5 peligro, 6 destructivo sólido. `size`: sm, md, lg o xl.
 * Mientras `loading` está activo queda deshabilitado salvo que `disabled` diga otra cosa.
 */
export const Button = ({
  variant = 2,
  size = "md",
  loading,
  className = "",
  children,
  disabled,
  ...props
}) => {
  const sizeClass = size !== "md" ? styles[size] : "";
  return (
    <button
      className={`${styles.btn} ${VARIANT_CLASS[variant]} ${sizeClass} ${className}`}
      disabled={disabled ?? loading}
      {...props}
    >
      {children}
    </button>
  );
};
