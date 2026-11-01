// Menú desplegable del kit: un disparador (el que quiera quien lo usa, por render
// prop) y una superficie flotante anclada a él con opciones, rótulos y separadores.
// Toda la mecánica vive aquí para que cada menú de la app no la repita: abrir y
// cerrar, clic fuera, Escape devolviendo el foco al disparador, flechas/Home/End
// entre opciones, Tab que cierra, y los atributos ARIA del patrón menu button.
// Entra y sale animado con motion, como Modal.
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "@/css/ui/menu.module.css";

// Lo que necesita cada MenuItem del menú que lo contiene: cerrar tras elegir.
const MenuContext = createContext(null);

const ITEM_SELECTOR = "[role=menuitem]:not(:disabled)";

/**
 * - `trigger(props, { open })`: render prop del disparador. `props` trae `ref`,
 *   `onClick`, `onKeyDown`, `aria-haspopup`, `aria-expanded` y `aria-controls`, y
 *   hay que pasarlas tal cual al elemento (normalmente un `Button`).
 * - `align`: borde del disparador al que se alinea la superficie, `start` o `end`
 *   (por defecto `start`). Usa `end` cuando el disparador está pegado a la derecha.
 * - `label`: nombre accesible de la lista (`aria-label` del `role="menu"`).
 * - `minWidth`: ancho mínimo de la superficie en px (por defecto 200).
 * - `children`: `MenuItem`, `MenuLabel` y `MenuSeparator`.
 */
export const Menu = ({
  trigger,
  align = "start",
  label,
  minWidth = 200,
  className = "",
  children,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const items = () => [...(listRef.current?.querySelectorAll(ITEM_SELECTOR) ?? [])];

  // Cerrar devolviendo el foco al disparador (Escape, elegir una opción)
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  // Clic fuera: cierra sin mover el foco, que ya se ha ido a donde se pulsó
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Al abrir, el foco entra en la primera opción para que el teclado funcione
  // sin más; con ratón no se ve el anillo porque no es :focus-visible.
  useEffect(() => {
    if (open) listRef.current?.querySelector(ITEM_SELECTOR)?.focus();
  }, [open]);

  const onTriggerKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (e) => {
    const list = items();
    const at = list.indexOf(document.activeElement);
    const go = (i) => list[(i + list.length) % list.length]?.focus();
    if (e.key === "Escape") {
      e.preventDefault();
      // Que un Modal o una pantalla que escuche Escape no lo reciba también
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      go(at < 0 ? -1 : at - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const triggerProps = {
    ref: triggerRef,
    onClick: () => setOpen((o) => !o),
    onKeyDown: onTriggerKeyDown,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
  };

  return (
    <div className={`${styles.anchor} ${className}`} ref={rootRef}>
      {trigger(triggerProps, { open })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={listId}
            ref={listRef}
            role="menu"
            aria-label={label}
            className={`${styles.surface} ${align === "end" ? styles.alignEnd : styles.alignStart}`}
            style={{ minWidth }}
            onKeyDown={onListKeyDown}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            // La salida es más corta que la entrada: cerrar no debe hacer esperar
            exit={{ opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.1, ease: "easeIn" } }}
            transition={{ duration: 0.16, ease: [0.22, 0.9, 0.36, 1] }}
          >
            <MenuContext.Provider value={close}>{children}</MenuContext.Provider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Opción del menú. `onSelect` se llama al elegirla (clic, Enter o Espacio) y después
 * el menú se cierra. `icon`: nodo a la izquierda; `meta`: dato atenuado a la derecha
 * (versión, atajo); `tone="danger"`: acción destructiva en rojo; `disabled`.
 */
export const MenuItem = ({ icon, meta, tone, disabled = false, onSelect, children }) => {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      className={`${styles.item} ${tone === "danger" ? styles.danger : ""}`}
      onClick={() => {
        close?.();
        onSelect?.();
      }}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{children}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </button>
  );
};

/** Texto no clicable dentro del menú (quién tiene la sesión, el título de un grupo). */
export const MenuLabel = ({ icon, children }) => (
  <div className={styles.label}>
    {icon && <span className={styles.icon}>{icon}</span>}
    <span className={styles.text}>{children}</span>
  </div>
);

/** Raya horizontal que separa grupos de opciones. */
export const MenuSeparator = () => <div role="separator" className={styles.separator} />;
