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
 * 3 contorno, 4 sutil, 5 peligro, 6 destructivo sólido. `size`: sm (24px), md (28px) o xl (38px).
 * Mientras `loading` está activo queda deshabilitado salvo que `disabled` diga otra cosa.
 *
 * Regla de uso por contexto:
 * - Cabecera de página, estado vacío y envío de formulario de página: variant 1, xl, icono 14.
 * - Pie de Modal, siempre por la prop `footer`: todo xl e iconos de 14, alineado a la derecha.
 *   Orden: [5 borrar, opcional] [hueco] [2 Cancel] [2 secundarias] [1 principal]. Las
 *   confirmaciones destructivas usan 6 como principal. «Close» solo si no queda nada pendiente.
 * - Acción auxiliar dentro de un formulario (elegir fichero): variant 3, md, icono 13.
 * - Filas, tarjetas, barras y cabeceras de panel: ToolButton; si hace falta un Button, 3 y sm.
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
  const sizeClass = (size !== "md" && styles[size]) || "";
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
