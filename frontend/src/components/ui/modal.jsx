// Modal del kit: superposición con desenfoque y panel centrado con cabecera
// (título + cerrar), cuerpo con scroll y pie opcional. Se pinta en un portal
// sobre `body`, bloquea el scroll de la página mientras está abierto y se
// cierra con Escape. Entra y sale animado (motion), por eso decide `open` y no
// quien lo usa montándolo o desmontándolo.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import styles from "@/css/ui/modal.module.css";

const SIZE_CLASS = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

/**
 * - `title`: título de la cabecera; si se omite, no hay cabecera.
 * - `footer`: zona fija inferior, normalmente las acciones.
 * - `size`: ancho predefinido (sm, md = 520px, lg, xl); se ignora si hay `width`.
 * - `width` / `height`: fuerzan el tamaño del panel (`"90vw"`, `560`…).
 * - `closeOnOverlayClick`: cerrar al pulsar fuera (por defecto sí).
 * - `hideClose`: oculta la X (p. ej. en confirmaciones).
 * - `bodyFlush`: quita el relleno del cuerpo cuando el contenido gestiona su propio layout.
 * - `zIndex`: orden de apilado; súbelo para pintar encima de otro modal (por defecto 9999).
 */
export const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  width,
  height,
  closeOnOverlayClick = true,
  hideClose = false,
  bodyFlush = false,
  zIndex,
}) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const widthOverride = width !== undefined ? { width, maxWidth: "none" } : undefined;
  const heightOverride = height !== undefined ? { height, maxHeight: "none" } : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          style={zIndex !== undefined ? { zIndex } : undefined}
          onClick={(e) => {
            if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.div
            className={`${styles.panel} ${widthOverride ? "" : SIZE_CLASS[size]}`}
            style={{ ...widthOverride, ...heightOverride }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 0.9, 0.36, 1] }}
          >
            {title !== undefined && (
              <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                {!hideClose && (
                  <button
                    type="button"
                    className={styles.close}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <div className={`${styles.body} ${bodyFlush ? styles.bodyFlush : ""}`}>{children}</div>
            {footer && <div className={styles.footer}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
