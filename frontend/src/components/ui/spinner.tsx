import { useEffect, useState } from 'react'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const INTERVAL_MS = 90

/** Animated Braille spinner frame; pauses when `active` is false. */
export function useSpinner(active = true): string {
    const [i, setI] = useState(0)
    useEffect(() => {
        if (!active) { setI(0); return }
        const t = setInterval(() => setI(n => (n + 1) % FRAMES.length), INTERVAL_MS)
        return () => clearInterval(t)
    }, [active])
    return FRAMES[i]
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
            <span style={{ color }}>{frame}</span>
            {label && (
                <span style={{ color: muted ? 'var(--om-fg-dim)' : 'var(--om-fg)' }}>
                    {label}
                </span>
            )}
        </span>
    )
}
