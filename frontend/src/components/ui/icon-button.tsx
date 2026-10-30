import styles from "@/css/ui/icon-button.module.css"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Texto accesible; también se usa como tooltip */
    label: string
    size?: "sm" | "md"
}

// Botón cuadrado solo con icono (cerrar, info, salir…)
export function IconButton({ label, size = "md", className = "", type = "button", children, ...props }: Props) {
    return (
        <button
            type={type}
            title={label}
            aria-label={label}
            className={`${styles.btn} ${size === "sm" ? styles.sm : ""} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
