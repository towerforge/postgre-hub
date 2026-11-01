// Barra de búsqueda del kit: lupa, etiqueta opcional, campo y botón para
// vaciarlo. Escape en cualquier parte de la página le quita el foco, para
// volver a los atajos de teclado sin tener que pulsar fuera.
import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import styles from "@/css/ui/search-bar.module.css";

const SIZES = ["lg", "xl"];

/**
 * Campo controlado: `onChange` recibe el texto, no el evento. `size`: lg 32px
 * (por defecto) o xl 38px.
 */
export const SearchBar = ({
  value,
  onChange,
  placeholder = "Search…",
  label,
  autoFocus,
  size = "lg",
  style,
  className = "",
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") inputRef.current?.blur();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className={`${styles.root} ${styles[SIZES.includes(size) ? size : "lg"]} ${className}`}
      style={style}
    >
      <span className={styles.prompt}>
        <Search size={14} />
      </span>
      {label && <span className={styles.label}>{label}</span>}
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange("")}
          aria-label="Clear"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
