import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import styles from '@/css/ui/segmented-control.module.css'
import inlineStyles from '@/css/ui/inline-select.module.css'
import selectStyles from '@/css/ui/select.module.css'

interface Option {
    value: string
    label: string
}

interface Props {
    label: string
    value: string
    options: Option[]
    onChange: (value: string) => void
    style?: React.CSSProperties
}

export function InlineSelect({ label, value, options, onChange, style }: Props) {
    const selected = options.find(o => o.value === value)

    const [open, setOpen]               = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)

    const wrapperRef  = useRef<HTMLDivElement>(null)
    const controlRef  = useRef<HTMLLabelElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    function handleOpen() {
        if (!open && controlRef.current) {
            const rect = controlRef.current.getBoundingClientRect()
            setDropdownPos({
                top:   rect.bottom + window.scrollY + 4,
                left:  rect.left   + window.scrollX,
                width: Math.max(rect.width, 140),
            })
        }
        setOpen(prev => !prev)
    }

    function handleSelect(opt: Option) {
        onChange(opt.value)
        setOpen(false)
        setActiveIndex(0)
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!open) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen() }
            return
        }
        if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, options.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
        else if (e.key === 'Enter')   { e.preventDefault(); if (options[activeIndex]) handleSelect(options[activeIndex]) }
        else if (e.key === 'Escape')  { setOpen(false) }
    }

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            const target = e.target as Node
            if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target))
                setOpen(false)
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const dropdown = open && dropdownPos ? createPortal(
        <div
            ref={dropdownRef}
            className={selectStyles.dropdown}
            style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            onMouseDown={e => e.preventDefault()}
        >
            <ul className={selectStyles.list} role="listbox">
                {options.map((opt, i) => (
                    <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === value}
                        className={[
                            selectStyles.option,
                            i === activeIndex          ? selectStyles.optionActive   : '',
                            opt.value === value        ? selectStyles.optionSelected : '',
                        ].filter(Boolean).join(' ')}
                        onMouseDown={() => handleSelect(opt)}
                        onMouseEnter={() => setActiveIndex(i)}
                    >
                        {opt.label}
                    </li>
                ))}
            </ul>
        </div>,
        document.body
    ) : null

    return (
        <div ref={wrapperRef} className={styles.root} style={style}>
            <label
                ref={controlRef}
                className={inlineStyles.root}
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className={inlineStyles.label}>{label}</span>
                <span className={inlineStyles.value}>{selected?.label}</span>
                <ChevronDown size={12} className={inlineStyles.arrow} />
            </label>
            {dropdown}
        </div>
    )
}
