import styles from "@/css/ui/form-row.module.css"

interface Props {
    label: string
    /** Ancho de la columna de la etiqueta (por defecto 120) */
    labelWidth?: number
    className?: string
    children: React.ReactNode
}

// Fila de formulario: etiqueta a la izquierda y control a la derecha
export function FormRow({ label, labelWidth = 120, className = "", children }: Props) {
    return (
        <div className={`${styles.row} ${className}`} style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}>
            <span className={styles.label}>{label}</span>
            <div className={styles.control}>{children}</div>
        </div>
    )
}
