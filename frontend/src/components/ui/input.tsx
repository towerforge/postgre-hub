import { AlertCircle } from "lucide-react"
import styles from "@/css/ui/input.module.css"

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: string
    hint?: string
    error?: string
    iconLeft?: React.ReactNode
    iconRight?: React.ReactNode
    size?: "md" | "lg"
}

export function Input({
    label,
    hint,
    error,
    iconLeft,
    iconRight,
    size = "md",
    disabled,
    required,
    id,
    className = "",
    ...props
}: Props) {
    const wrapperClass = [
        styles.wrapper,
        disabled ? styles.disabled : "",
        error    ? styles.error    : "",
    ].join(" ")

    return (
        <div className={wrapperClass}>
            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={`${styles.control} ${size === "lg" ? styles.lg : ""}`}>
                {iconLeft  && <span className={styles.iconLeft}>{iconLeft}</span>}
                <input
                    id={id}
                    disabled={disabled}
                    required={required}
                    className={`${styles.input} ${className}`}
                    {...props}
                />
                {iconRight && <span className={styles.iconRight}>{iconRight}</span>}
            </div>

            {error && (
                <span className={`${styles.message} ${styles.errorMsg}`}>
                    <AlertCircle size={12} className={styles.messageIcon} />
                    {error}
                </span>
            )}

            {hint && !error && (
                <span className={`${styles.message} ${styles.hint}`}>{hint}</span>
            )}
        </div>
    )
}
