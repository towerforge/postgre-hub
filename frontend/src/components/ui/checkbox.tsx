import { Check } from 'lucide-react'
import styles from '@/css/ui/checkbox.module.css'

interface Props {
    checked:   boolean
    onChange:  (checked: boolean) => void
    label?:    React.ReactNode
    /** Texto secundario bajo la etiqueta */
    description?: React.ReactNode
    disabled?: boolean
}

export function Checkbox({ checked, onChange, label, description, disabled }: Props) {
    return (
        <div
            className={`${styles.root} ${description ? styles.withDescription : ''} ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange(!checked) } }}
        >
            <div className={`${styles.box} ${checked ? styles.checked : ''}`}>
                <span className={styles.tick}>
                    <Check size={9} strokeWidth={3} />
                </span>
            </div>
            {(label || description) && (
                <span className={styles.text}>
                    {label && <span className={styles.label}>{label}</span>}
                    {description && <span className={styles.description}>{description}</span>}
                </span>
            )}
        </div>
    )
}
