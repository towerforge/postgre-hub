// Modal del kit: superposición con desenfoque y panel centrado con cabecera
// (título + cerrar), cuerpo con scroll y pie opcional. Se pinta en un portal
// sobre `body`, bloquea el scroll de la página mientras está abierto y se
// cierra con Escape. Entra y sale animado (motion), por eso decide `open` y no
// quien lo usa montándolo o desmontándolo. Si aun así se monta condicionalmente,
// basta envolverlo en `<AnimatePresence>`: la salida se propaga hasta aquí.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "./button";
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

  // Montado mientras está abierto o saliendo. Un modal cerrado no deja un
  // AnimatePresence vacío que, con `propagate`, bloquearía la salida del padre.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);

  const widthOverride = width !== undefined ? { width, maxWidth: "none" } : undefined;
  const heightOverride = height !== undefined ? { height, maxHeight: "none" } : undefined;

  if (!present) return null;

  return createPortal(
    // `propagate`: un AnimatePresence de fuera que retire el modal también
    // dispara esta salida
    <AnimatePresence propagate onExitComplete={() => setPresent(false)}>
      {open && (
        <motion.div
          className={styles.overlay}
          style={zIndex !== undefined ? { zIndex } : undefined}
          onClick={(e) => {
            if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // La salida es más corta que la entrada: cerrar no debe hacer esperar
          exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <motion.div
            className={`${styles.panel} ${widthOverride ? "" : SIZE_CLASS[size]}`}
            style={{ ...widthOverride, ...heightOverride }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 8,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
            }}
            transition={{ duration: 0.28, ease: [0.22, 0.9, 0.36, 1] }}
          >
            {title !== undefined && (
              <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                {!hideClose && (
                  <Button variant={8} label="Close" onClick={onClose}>
                    <X size={16} />
                  </Button>
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
