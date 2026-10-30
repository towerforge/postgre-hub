import styles from "@/css/ui/input.module.css"

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    mono?: boolean
}

// Campo de texto multilínea con el mismo aspecto que Input
export function Textarea({ label, mono = false, id, className = "", ...props }: Props) {
    return (
        <div className={styles.wrapper}>
            {label && <label className={styles.label} htmlFor={id}>{label}</label>}
            <textarea
                id={id}
                className={`${styles.textarea} ${mono ? styles.mono : ""} ${className}`}
                {...props}
            />
        </div>
    )
}
