import styles from "@/css/ui/badge.module.css"

interface Props {
    tone?: "accent" | "neutral"
    className?: string
    children: React.ReactNode
}

// Pastilla de contador (cambios pendientes, número de elementos…)
export function Badge({ tone = "accent", className = "", children }: Props) {
    return <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>
}
