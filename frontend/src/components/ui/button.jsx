// Botón del kit. Reúne en un solo componente todos los tipos de botón de la
// aplicación (incluidos los antiguos ToolButton e IconButton) como variantes
// numeradas, y todos miden lo que marca la escala --control-h-* de index.css.
import styles from "@/css/ui/button.module.css";

const VARIANT_CLASS = {
  1: styles.primary,
  2: styles.secondary,
  3: styles.outline,
  4: styles.subtle,
  5: styles.danger,
  6: styles.destructive,
  7: styles.tool,
  8: styles.icon,
};

const SIZES = ["lg", "xl"];

/**
 * `variant` numerada por prominencia:
 *   1 primario, 2 secundario, 3 contorno, 4 sutil, 5 peligro (ghost),
 *   6 destructivo sólido, 7 tool (ligero de barras y filas; admite `active`),
 *   8 icon (cuadrado solo con icono; `label` obligatorio, va a aria-label y title).
 * `size`: lg 32px (por defecto) o xl 38px.
 * `iconOnly` hace cuadrado (ancho = alto) cualquier variante.
 * Mientras `loading` está activo queda deshabilitado salvo que `disabled` diga otra cosa.
 * Las variantes 7 y 8 son type="button" por defecto; el resto conserva el
 * comportamiento nativo (submit dentro de un formulario).
 *
 * Regla de uso por contexto:
 * - Cabecera de página, estado vacío y envío de formulario de página: variant 1, xl, icono 14.
 * - Pie de Modal, siempre por la prop `footer`: todo xl e iconos de 14, alineado a la derecha.
 *   Orden: [5 borrar, opcional] [hueco] [2 Cancel] [2 secundarias] [1 principal]. Las
 *   confirmaciones destructivas usan 6 como principal. «Close» solo si no queda nada pendiente.
 * - Acción auxiliar dentro de un formulario (elegir fichero): variant 3, lg, icono 13.
 * - Filas, tarjetas, barras y cabeceras de panel: variant 7, lg.
 * - Acciones solo con icono (cerrar, info, salir): variant 8.
 */
export const Button = ({
  variant = 2,
  size = "lg",
  active = false,
  iconOnly = false,
  label,
  loading,
  type,
  className = "",
  children,
  disabled,
  ...props
}) => {
  const v = Number(variant);
  const sizeClass = styles[SIZES.includes(size) ? size : "lg"];
  const classes = [
    styles.btn,
    VARIANT_CLASS[v] ?? styles.secondary,
    sizeClass,
    iconOnly || v === 8 ? styles.square : "",
    iconOnly && v === 7 ? styles.toolIcon : "",
    active ? styles.active : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type ?? (v >= 7 ? "button" : undefined)}
      title={label}
      aria-label={label}
      className={classes}
      disabled={disabled ?? loading}
      {...props}
    >
      {children}
    </button>
  );
};
