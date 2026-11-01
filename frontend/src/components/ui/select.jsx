// Selector desplegable del kit: sustituye al <select> nativo para que la lista
// tenga el aspecto de la aplicación y, con `searchable`, un filtro. La lista se
// pinta en un portal posicionado bajo el control, para que no la recorte el
// overflow de modales y paneles. Funciona controlado (`value`) o no
// (`defaultValue`), y lleva un <input type="hidden"> para enviarse en formularios.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ChevronDown } from "lucide-react";
import styles from "@/css/ui/select.module.css";

const SIZES = ["lg", "xl"];

/**
 * `options` es una lista de `{ value, label }`. `onChange` recibe un evento
 * imitado (`{ target: { name, value } }`) para poder compartir manejador con los
 * inputs nativos de un formulario. `size`: lg 32px (por defecto)
 * o xl 38px; el campo de búsqueda del desplegable usa el mismo alto que el disparador.
 */
export const Select = ({
  id,
  name,
  label,
  hint,
  error,
  options,
  placeholder,
  value: controlledValue,
  defaultValue,
  disabled = false,
  required = false,
  searchable = false,
  size = "lg",
  className = "",
  onChange,
}) => {
  const sizeClass = styles[SIZES.includes(size) ? size : "lg"];
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState(null);

  const wrapperRef = useRef(null);
  const controlRef = useRef(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);
  const filtered =
    searchable && search
      ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : options;

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  };

  const handleOpen = () => {
    if (disabled) return;
    if (!open && controlRef.current) {
      const rect = controlRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen((prev) => !prev);
  };

  const handleSelect = (opt) => {
    if (!isControlled) setInternalValue(opt.value);
    closeDropdown();
    onChange?.({ target: { name: name ?? "", value: opt.value } });
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) handleSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  };

  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  useEffect(() => {
    const onClickOutside = (e) => {
      const target = e.target;
      const insideWrapper = wrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideWrapper && !insideDropdown) closeDropdown();
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const wrapperClass = [
    styles.wrapper,
    sizeClass,
    disabled ? styles.disabled : "",
    error ? styles.error : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const controlClass = [styles.control, open ? styles.controlOpen : ""].join(" ");

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            className={`${styles.dropdown} ${sizeClass}`}
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {searchable && (
              <div className={styles.search}>
                <div className={styles.searchControl}>
                  <input
                    ref={searchRef}
                    type="text"
                    className={styles.searchInput}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar..."
                  />
                </div>
              </div>
            )}
            <ul id={`${id}-listbox`} className={styles.list} role="listbox">
              {filtered.length === 0 ? (
                <li className={styles.noResults}>Sin resultados</li>
              ) : (
                filtered.map((opt, i) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    className={[
                      styles.option,
                      i === activeIndex ? styles.optionActive : "",
                      opt.value === value ? styles.optionSelected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseDown={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={wrapperClass} ref={wrapperRef}>
      <input type="hidden" name={name} value={value ?? ""} />

      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}

      <div
        id={id}
        ref={controlRef}
        className={controlClass}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-listbox` : undefined}
      >
        <span className={`${styles.value} ${!selectedOption ? styles.placeholder : ""}`}>
          {selectedOption ? selectedOption.label : (placeholder ?? "")}
        </span>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          <ChevronDown size={14} />
        </span>
      </div>

      {dropdown}

      {error && (
        <span className={`${styles.message} ${styles.errorMsg}`}>
          <AlertCircle size={12} />
          {error}
        </span>
      )}

      {hint && !error && <span className={`${styles.message} ${styles.hint}`}>{hint}</span>}
    </div>
  );
};
