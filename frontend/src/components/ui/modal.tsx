import { useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import styles from "@/css/ui/modal.module.css"

export type ModalSize = "sm" | "md" | "lg" | "xl"

interface Props {
    open: boolean
    onClose: () => void
    /** Header title. If omitted, the header bar is hidden. */
    title?: React.ReactNode
    /** Body content (scrollable). */
    children: React.ReactNode
    /** Optional sticky bottom region — typically actions. */
    footer?: React.ReactNode
    /** Width preset. Defaults to `md` (520px). Ignored if `width` is set. */
    size?: ModalSize
    /** Override the panel width (e.g. `"90vw"`, `560`). */
    width?: string | number
    /** Override the panel height (e.g. `"85vh"`, `640`). */
    height?: string | number
    /** Close when clicking the overlay (default: true). */
    closeOnOverlayClick?: boolean
    /** Hide the × close icon (e.g. for confirms). */
    hideClose?: boolean
    /** Remove padding around the body (use when children manage their own layout). */
    bodyFlush?: boolean
    /** Stacking order — increase to render above other modals (default 9999). */
    zIndex?: number
}

const SIZE_CLASS: Record<ModalSize, string> = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    xl: styles.sizeXl,
}

export function Modal({
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
}: Props) {
    useEffect(() => {
        if (!open) return
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [open])

    useEffect(() => {
        if (!open) return
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    const widthOverride =
        width !== undefined ? { width, maxWidth: "none" } : undefined
    const heightOverride =
        height !== undefined ? { height, maxHeight: "none" } : undefined

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className={styles.overlay}
                    style={zIndex !== undefined ? { zIndex } : undefined}
                    onClick={e => {
                        if (closeOnOverlayClick && e.target === e.currentTarget) onClose()
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
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit={{    opacity: 0, scale: 0.94, y: 10 }}
                        transition={{ duration: 0.28, ease: [0.22, 0.9, 0.36, 1] }}
                    >
                        {title !== undefined && (
                            <div className={styles.header}>
                                <span className={styles.title}>{title}</span>
                                {!hideClose && (
                                    <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className={`${styles.body} ${bodyFlush ? styles.bodyFlush : ""}`}>
                            {children}
                        </div>
                        {footer && (
                            <div className={styles.footer}>{footer}</div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    )
}
