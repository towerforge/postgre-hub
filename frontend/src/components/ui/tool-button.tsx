import styles from "@/css/ui/tool-button.module.css"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Estado activo (panel visible, menú abierto…) */
    active?: boolean
    /** Solo icono: botón cuadrado y atenuado */
    iconOnly?: boolean
    /** sm: barra de estado */
    size?: "sm" | "md"
}

// Botón ligero de barra de herramientas, cabeceras y filas de listado
export function ToolButton({ active = false, iconOnly = false, size = "md", className = "", type = "button", children, ...props }: Props) {
    return (
        <button
            type={type}
            className={`${styles.btn} ${iconOnly ? styles.iconOnly : ""} ${size === "sm" ? styles.sm : ""} ${active ? styles.active : ""} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
