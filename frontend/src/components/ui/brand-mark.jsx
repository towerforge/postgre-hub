// Marca de Postgre Hub: el monograma PH "Join". La base de la panza de la P sigue
// recta y se convierte en el travesaño de la H, una sola línea que une las dos
// letras como un JOIN. Se dibuja en una cuadrícula de 48 con un único trazo de 5 y
// extremos rectos, igual que la propuesta aprobada.
//
// Va en el kit y no en components/ porque es una pieza puramente visual: no lee
// estado, contextos ni datos, la usan el marco, la pantalla de acceso y el About, y
// sigue las reglas del kit (su propio CSS Module, tokens --om-* y ejemplo en
// /design-system).
//
// Tres formas: el símbolo suelto (color del texto, `currentColor`), el icono de app
// (`tile`: el símbolo en blanco sobre un squircle --om-primary) y el lockup
// (`wordmark`: símbolo y nombre en fila).
import styles from "@/css/ui/brand-mark.module.css";

// Geometría exacta de la propuesta A (viewBox 0 0 48 48, stroke-width 5).
const CROSSBAR = "M7.5 24H40.5";
const LETTERS = "M7.5 42V8.5H12A7.75 7.75 0 0 1 12 24H7.5M27.5 6V42M40.5 6V42";

// En el icono de app el símbolo ocupa 304/512 del squircle.
const TILE_RATIO = 304 / 512;

const Glyph = ({ size, accent, label, className = "" }) => {
  // `accent` true usa el token (--om-accent); una cadena es un color CSS concreto.
  const style = typeof accent === "string" ? { "--brand-mark-accent": accent } : undefined;
  return (
    <svg
      className={`${styles.glyph} ${accent ? styles.accent : ""} ${className}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : "true"}
      focusable="false"
    >
      {/* El travesaño va primero: la P y la H se pintan encima en los cruces */}
      <path className={styles.crossbar} d={CROSSBAR} />
      <path d={LETTERS} />
    </svg>
  );
};

/**
 * Monograma PH de Postgre Hub.
 * - `size`: lado en px del símbolo, o del squircle con `tile` (24 por defecto).
 * - `accent`: false (una tinta, por defecto), true (travesaño en --om-accent) o un color CSS.
 * - `tile`: icono de app, símbolo blanco sobre squircle --om-primary.
 * - `wordmark`: añade "Postgre Hub" a la derecha (el texto mide 0,7 del símbolo).
 * - `label`: nombre accesible; sin él, la marca es decorativa (aria-hidden).
 */
export const BrandMark = ({
  size = 24,
  accent = false,
  tile = false,
  wordmark = false,
  label,
  className = "",
}) => {
  if (tile) {
    return (
      <span
        className={`${styles.tile} ${className}`}
        style={{ width: size, height: size }}
        role={label ? "img" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : "true"}
      >
        <Glyph size={Math.round(size * TILE_RATIO)} accent={false} />
      </span>
    );
  }
  if (wordmark) {
    return (
      <span
        className={`${styles.lockup} ${className}`}
        style={{ fontSize: size * 0.7, gap: size * 0.35 }}
      >
        <Glyph size={size} accent={accent} />
        <span>Postgre Hub</span>
      </span>
    );
  }
  return <Glyph size={size} accent={accent} label={label} className={className} />;
};
