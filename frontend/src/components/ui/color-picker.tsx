import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Slash } from 'lucide-react'

export const CONNECTION_COLORS = [
    '#8aa6c1', '#c4a7e7', '#91b4b8', '#9eb87f', '#d8b88a',
    '#c98c6c', '#c47b7b', '#7b8fa1', '#a3b8d0', '#b8a4cc',
    '#9aa9e0', '#7ea89e', '#a8c9a8', '#c0c98e', '#e0c890',
    '#e0a87a', '#b8967e', '#d4a0a0', '#a08c7b', '#9c9a8a',
    '#5e8a8e', '#86729e', '#dba6c2', '#7d7d7d',
] as const

interface Props {
    value: string
    onChange: (color: string) => void
    colors?: readonly string[]
}

interface PopoverPos { top: number; left: number; width: number }

export function ColorPicker({ value, onChange, colors = CONNECTION_COLORS }: Props) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<PopoverPos | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    const handleToggle = () => {
        if (!open && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
        }
        setOpen(o => !o)
    }

    const selectedIndex = value ? colors.indexOf(value) : -1
    const label = !value ? 'Auto' : selectedIndex >= 0 ? `Color ${selectedIndex + 1}` : value

    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const t = e.target as Node
            if (triggerRef.current?.contains(t)) return
            if (popoverRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onClick)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const cell = (color: string, key: string, index?: number) => {
        const selected = color === value
        return (
            <button
                key={key}
                type="button"
                onClick={() => { onChange(color); setOpen(false) }}
                title={color || 'Auto'}
                style={{
                    width: 24,
                    height: 24,
                    background: color || 'transparent',
                    border: selected ? '1px solid var(--om-fg-bright)' : '1px solid var(--om-border)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color ? 'var(--om-bg)' : 'var(--om-fg-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    lineHeight: 1,
                }}
            >
                {!color ? <Slash size={12} /> : index}
            </button>
        )
    }

    const popover = open && pos ? createPortal(
        <div
            ref={popoverRef}
            style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                padding: 8,
                background: 'var(--om-bg-2)',
                border: '1px solid var(--om-border-focus)',
                zIndex: 10000,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 24px)',
                gap: 6,
            }}
        >
            {cell('', '__auto__')}
            {colors.map((c, i) => cell(c, c, i + 1))}
        </div>,
        document.body,
    ) : null

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                title={value || 'Auto'}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 32,
                    padding: '0 28px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--om-bg)',
                    border: `1px solid ${open ? 'var(--om-green)' : 'var(--om-border)'}`,
                    color: 'var(--om-fg-bright)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                    userSelect: 'none',
                }}
                onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--om-fg-muted)' }}
                onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--om-border)' }}
            >
                <span
                    style={{
                        width: 16,
                        height: 16,
                        background: value || 'transparent',
                        border: '1px solid var(--om-border)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--om-fg-muted)',
                        flexShrink: 0,
                    }}
                >
                    {!value && <Slash size={10} />}
                </span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                </span>
                <span
                    style={{
                        position: 'absolute',
                        right: 10,
                        display: 'flex',
                        alignItems: 'center',
                        color: open ? 'var(--om-fg-bright)' : 'var(--om-fg-muted)',
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s',
                        pointerEvents: 'none',
                    }}
                >
                    <ChevronDown size={14} />
                </span>
            </button>
            {popover}
        </>
    )
}
