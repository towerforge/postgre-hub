import styles from '@/css/ui/stat-pill.module.css'

interface Props {
    label: string
    value: React.ReactNode
    valueColor?: string
    className?: string
    style?: React.CSSProperties
}

export function StatPill({ label, value, valueColor, className = '', style }: Props) {
    return (
        <div className={`${styles.root} ${className}`} style={style}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
                {value}
            </span>
        </div>
    )
}
