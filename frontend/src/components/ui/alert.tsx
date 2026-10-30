import { CheckCircle, AlertCircle, Info } from "lucide-react"
import styles from "@/css/ui/alert.module.css"

type Tone = "error" | "success" | "warning" | "info"

const ICON = { error: AlertCircle, success: CheckCircle, warning: AlertCircle, info: Info }

interface Props {
    tone?: Tone
    className?: string
    children: React.ReactNode
}

// Mensaje de estado: error, éxito o información
export function Alert({ tone = "error", className = "", children }: Props) {
    const Icon = ICON[tone]
    return (
        <div role={tone === "error" ? "alert" : "status"} className={`${styles.alert} ${styles[tone]} ${className}`}>
            <Icon size={14} className={styles.icon} />
            <span className={styles.content}>{children}</span>
        </div>
    )
}
