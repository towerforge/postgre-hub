import { useEffect, useRef, useState } from 'react'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const INTERVAL_MS = 90

/** Animated Braille spinner frame; pauses when `active` is false. */
export function useSpinner(active = true): string {
    const [tick, setTick] = useState(0)
    const idRef = useRef<number | null>(null)

    useEffect(() => {
        if (!active) {
            if (idRef.current !== null) { window.clearInterval(idRef.current); idRef.current = null }
            return
        }
        idRef.current = window.setInterval(() => setTick(t => (t + 1) >>> 0), INTERVAL_MS)
        return () => {
            if (idRef.current !== null) { window.clearInterval(idRef.current); idRef.current = null }
        }
    }, [active])

    return FRAMES[tick % FRAMES.length]
}

interface Props {
    label?: string
    /** Tailwind-like color token; defaults to phosphor green. */
    color?: string
    /** Inline glyph size in px (default 13). */
    size?: number
    /** Mute the surrounding label. */
    muted?: boolean
}

export function Spinner({ label, color = 'var(--om-green)', size = 13, muted = true }: Props) {
    const frame = useSpinner(true)
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: size,
            lineHeight: 1,
        }}>
            <span style={{ color, display: 'inline-block', minWidth: '1ch', textAlign: 'center' }}>
                {frame}
            </span>
            {label && (
                <span style={{ color: muted ? 'var(--om-fg-dim)' : 'var(--om-fg)' }}>
                    {label}
                </span>
            )}
        </span>
    )
}
