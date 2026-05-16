import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, ChevronDown } from "lucide-react"
import styles from "@/css/ui/select.module.css"

interface Option {
    value: string
    label: string
}

interface Props {
    id?: string
    name?: string
    label?: string
    hint?: string
    error?: string
    options: Option[]
    placeholder?: string
    value?: string
    defaultValue?: string
    disabled?: boolean
    required?: boolean
    searchable?: boolean
    className?: string
    onChange?: (e: { target: { name: string; value: string } }) => void
}

interface DropdownPos { top: number; left: number; width: number }

export function Select({
    id,
    name,
    label,
    hint,
    error,
    options,
    placeholder,
    value: controlledValue,
    defaultValue,
    disabled = false,
    required = false,
    searchable = false,
    className = "",
    onChange,
}: Props) {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = useState(defaultValue ?? "")
    const value = isControlled ? controlledValue : internalValue

    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [activeIndex, setActiveIndex] = useState(0)
    const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)

    const wrapperRef = useRef<HTMLDivElement>(null)
    const controlRef = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find(o => o.value === value)
    const filtered = searchable && search
        ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        : options

    function closeDropdown() {
        setOpen(false)
        setSearch("")
        setActiveIndex(0)
    }

    function handleOpen() {
        if (disabled) return
        if (!open && controlRef.current) {
            const rect = controlRef.current.getBoundingClientRect()
            setDropdownPos({
                top:   rect.bottom + window.scrollY + 4,
                left:  rect.left + window.scrollX,
                width: rect.width,
            })
        }
        setOpen(prev => !prev)
    }

    function handleSelect(opt: Option) {
        if (!isControlled) setInternalValue(opt.value)
        closeDropdown()
        onChange?.({ target: { name: name ?? "", value: opt.value } })
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (!open) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpen() }
            return
        }
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
        else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) handleSelect(filtered[activeIndex]) }
        else if (e.key === "Escape") { closeDropdown() }
    }

    useEffect(() => {
        if (open && searchable) {
            const t = setTimeout(() => searchRef.current?.focus(), 30)
            return () => clearTimeout(t)
        }
    }, [open, searchable])

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            const target = e.target as Node
            const insideWrapper  = wrapperRef.current?.contains(target)
            const insideDropdown = dropdownRef.current?.contains(target)
            if (!insideWrapper && !insideDropdown) closeDropdown()
        }
        document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [])

    const wrapperClass = [
        styles.wrapper,
        disabled ? styles.disabled : "",
        error    ? styles.error    : "",
        className,
    ].filter(Boolean).join(" ")

    const controlClass = [styles.control, open ? styles.controlOpen : ""].join(" ")

    const dropdown = open && dropdownPos ? createPortal(
        <div
            ref={dropdownRef}
            className={styles.dropdown}
            style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            onMouseDown={e => e.preventDefault()}
        >
            {searchable && (
                <div className={styles.search}>
                    <div className={styles.searchControl}>
                        <input
                            ref={searchRef}
                            type="text"
                            className={styles.searchInput}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setActiveIndex(0) }}
                            onKeyDown={handleKeyDown}
                            placeholder="Buscar..."
                        />
                    </div>
                </div>
            )}
            <ul id={`${id}-listbox`} className={styles.list} role="listbox">
                {filtered.length === 0 ? (
                    <li className={styles.noResults}>Sin resultados</li>
                ) : (
                    filtered.map((opt, i) => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            className={[
                                styles.option,
                                i === activeIndex ? styles.optionActive : "",
                                opt.value === value ? styles.optionSelected : "",
                            ].filter(Boolean).join(" ")}
                            onMouseDown={() => handleSelect(opt)}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            {opt.label}
                        </li>
                    ))
                )}
            </ul>
        </div>,
        document.body
    ) : null

    return (
        <div className={wrapperClass} ref={wrapperRef}>
            <input type="hidden" name={name} value={value ?? ""} />

            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div
                id={id}
                ref={controlRef}
                className={controlClass}
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? `${id}-listbox` : undefined}
            >
                <span className={`${styles.value} ${!selectedOption ? styles.placeholder : ""}`}>
                    {selectedOption ? selectedOption.label : (placeholder ?? "")}
                </span>
                <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
                    <ChevronDown size={14} />
                </span>
            </div>

            {dropdown}

            {error && (
                <span className={`${styles.message} ${styles.errorMsg}`}>
                    <AlertCircle size={12} />
                    {error}
                </span>
            )}

            {hint && !error && (
                <span className={`${styles.message} ${styles.hint}`}>{hint}</span>
            )}
        </div>
    )
}
