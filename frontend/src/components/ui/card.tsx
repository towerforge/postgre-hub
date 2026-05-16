import styles from "@/css/ui/card.module.css"

type Variant = "default" | "outlined" | "elevated" | "filled"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: Variant
    interactive?: boolean
}

export function Card({ variant = "default", interactive = false, className = "", children, ...props }: CardProps) {
    const variantClass = variant !== "default" ? styles[variant] : ""
    return (
        <div
            className={`${styles.card} ${variantClass} ${interactive ? styles.interactive : ""} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    actions?: React.ReactNode
}

export function CardHeader({ title, actions, className = "", children, ...props }: CardHeaderProps) {
    return (
        <div className={`${styles.header} ${className}`} {...props}>
            {title ? <span className={styles.title}>{title}</span> : children}
            {actions && <div>{actions}</div>}
        </div>
    )
}

export function CardBody({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`${styles.body} ${className}`} {...props} />
}

export function CardFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`${styles.footer} ${className}`} {...props} />
}
