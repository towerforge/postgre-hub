import styles from "@/css/ui/list-item.module.css"

interface Props {
    /** Elemento a la izquierda (avatar, icono…) */
    leading?: React.ReactNode
    title: React.ReactNode
    subtitle?: React.ReactNode
    /** Subtítulo en monoespaciada (URIs, rutas). Por defecto true */
    mono?: boolean
    /** Acciones a la derecha */
    actions?: React.ReactNode
    onClick?: () => void
    /** Opción marcada (lista de selección única) */
    selected?: boolean
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    className?: string
}

// Fila de listado con fondo plano y borde fino
export function ListItem({ leading, title, subtitle, actions, onClick, selected, mono = true, onMouseEnter, onMouseLeave, className = "" }: Props) {
    // Con onClick la fila se comporta como un botón, también con teclado
    const interactive = onClick ? {
        role: "button",
        tabIndex: 0,
        "aria-pressed": selected,
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.target !== e.currentTarget) return
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() }
        },
    } : {}
    return (
        <div
            className={`${styles.item} ${onClick ? styles.clickable : ""} ${selected ? styles.selected : ""} ${className}`}
            onClick={onClick}
            {...interactive}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {leading}
            <div className={styles.body}>
                <div className={styles.title}>{title}</div>
                {subtitle && <div className={`${styles.subtitle} ${mono ? styles.mono : ""}`}>{subtitle}</div>}
            </div>
            {actions}
        </div>
    )
}

export function ListItemGroup({ children }: { children: React.ReactNode }) {
    return <div className={styles.group}>{children}</div>
}
