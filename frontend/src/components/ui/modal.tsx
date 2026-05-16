import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import styles from "@/css/ui/modal.module.css"

interface Props {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: Props) {
    useEffect(() => {
        if (!open) return
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [open])

    useEffect(() => {
        if (!open) return
        function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, onClose])

    if (!open) return null

    return createPortal(
        <div
            className={styles.overlay}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className={styles.panel}>
                <div className={styles.header}>
                    <span className={styles.title}>{title}</span>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
                </div>
                <div className={styles.body}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
