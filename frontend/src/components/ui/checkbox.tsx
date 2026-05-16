import { Check } from 'lucide-react'
import styles from '@/css/ui/checkbox.module.css'

interface Props {
    checked:   boolean
    onChange:  (checked: boolean) => void
    label?:    string
    disabled?: boolean
}

export function Checkbox({ checked, onChange, label, disabled }: Props) {
    return (
        <div
            className={`${styles.root} ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onChange(!checked) }}
        >
            <div className={`${styles.box} ${checked ? styles.checked : ''}`}>
                <span className={styles.tick}>
                    <Check size={9} strokeWidth={3} />
                </span>
            </div>
            {label && <span className={styles.label}>{label}</span>}
        </div>
    )
}
