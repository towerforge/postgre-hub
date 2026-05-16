import styles from '@/css/ui/segmented-control.module.css'

interface Option<T extends string> {
    value: T
    label: string
}

interface Props<T extends string> {
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
    style?: React.CSSProperties
}

export function SegmentedControl<T extends string>({ options, value, onChange, className = '', style }: Props<T>) {
    return (
        <div className={`${styles.root} ${className}`} style={style}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    className={`${styles.item} ${opt.value === value ? styles.itemActive : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}
