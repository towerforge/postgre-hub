import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import styles from '@/css/ui/search-bar.module.css'

interface Props {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    autoFocus?: boolean
    style?: React.CSSProperties
    className?: string
}

export function SearchBar({
    value,
    onChange,
    placeholder = 'type to filter…',
    label = 'search:',
    autoFocus,
    style,
    className = '',
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') inputRef.current?.blur()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    return (
        <div className={`${styles.root} ${className}`} style={style}>
            <span className={styles.prompt}>❯</span>
            <span className={styles.label}>{label}</span>
            <input
                ref={inputRef}
                className={styles.input}
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                spellCheck={false}
                autoComplete="off"
                autoFocus={autoFocus}
            />
            {value && (
                <button className={styles.clear} onClick={() => onChange('')} aria-label="Clear">
                    <X size={13} />
                </button>
            )}
        </div>
    )
}
