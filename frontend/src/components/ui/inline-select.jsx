// Selector compacto en línea: «Etiqueta: valor ⌄» con el aspecto de un
// SegmentedControl y la misma lista desplegable que Select. Pensado para
// barras de herramientas, donde un Select con su caja de campo pesa demasiado.
// La lista se pinta en un portal para que no la recorte el overflow de la barra.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import styles from "@/css/ui/inline-select.module.css";

/** Selector controlado: `options` es una lista de `{ value, label }` y `onChange` recibe el `value` elegido. */
export const InlineSelect = ({ label, value, options, onChange, style }) => {
  const selected = options.find((o) => o.value === value);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState(null);

  const wrapperRef = useRef(null);
  const controlRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleOpen = () => {
    if (!open && controlRef.current) {
      const rect = controlRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 140),
      });
    }
    setOpen((prev) => !prev);
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setActiveIndex(0);
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
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[activeIndex]) handleSelect(options[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      const target = e.target;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <ul className={styles.list} role="listbox">
              {options.map((opt, i) => (
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
              ))}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapperRef} className={styles.wrapper} style={style}>
      <label
        ref={controlRef}
        className={styles.root}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{selected?.label}</span>
        <ChevronDown size={12} className={styles.arrow} />
      </label>
      {dropdown}
    </div>
  );
};
