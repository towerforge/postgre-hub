import styles from "@/css/ui/button.module.css"

type Variant = 1 | 2 | 3 | 4 | 5
type Size    = "sm" | "md" | "lg"

const VARIANT_CLASS: Record<Variant, string> = {
    1: styles.primary,
    2: styles.secondary,
    3: styles.outline,
    4: styles.subtle,
    5: styles.danger,
}

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
}

export function Button({ variant = 2, size = "md", loading, className = "", children, disabled, ...props }: Props) {
    const sizeClass = size !== "md" ? styles[size] : ""
    return (
        <button
            className={`${styles.btn} ${VARIANT_CLASS[variant]} ${sizeClass} ${className}`}
            disabled={disabled ?? loading}
            {...props}
        >
            {loading && <span className={styles.spinner} />}
            {children}
        </button>
    )
}
