import { useEffect, useRef, useState } from 'react'

type Axis = 'x' | 'y'

interface Options {
    /** Clave con la que se recuerda el tamaño en este navegador */
    key: string
    initial: number
    min: number
    max: number
    axis: Axis
    /** true cuando arrastrar hacia la izquierda/arriba debe hacer crecer el panel */
    invert?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function readStored(key: string, fallback: number): number {
    try {
        const v = Number(localStorage.getItem(key))
        return Number.isFinite(v) && v > 0 ? v : fallback
    } catch {
        return fallback
    }
}

// Tamaño de un panel que se ajusta arrastrando un separador; doble clic lo restaura
export function useResizable({ key, initial, min, max, axis, invert = false }: Options) {
    const storageKey = `panel-size:${key}`
    const [size, setSize] = useState(() => clamp(readStored(storageKey, initial), min, max))
    const [dragging, setDragging] = useState(false)
    const start = useRef<{ pos: number; size: number } | null>(null)

    const pos = (e: React.PointerEvent) => (axis === 'x' ? e.clientX : e.clientY)

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return
        e.preventDefault()
        start.current = { pos: pos(e), size }
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
    }

    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        if (!start.current) return
        const delta = pos(e) - start.current.pos
        setSize(clamp(start.current.size + (invert ? -delta : delta), min, max))
    }

    const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
        if (!start.current) return
        start.current = null
        setDragging(false)
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    }

    // Durante el arrastre: cursor fijo y sin selección de texto en toda la página
    useEffect(() => {
        if (!dragging) return
        const cls = axis === 'x' ? 'resizing-x' : 'resizing-y'
        document.body.classList.add(cls)
        return () => document.body.classList.remove(cls)
    }, [dragging, axis])

    // Se guarda al soltar, no en cada movimiento
    useEffect(() => {
        if (dragging) return
        try { localStorage.setItem(storageKey, String(Math.round(size))) } catch { /* almacenamiento no disponible */ }
    }, [dragging, size, storageKey])

    return {
        size,
        dragging,
        handleProps: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: onPointerUp,
            onDoubleClick: () => setSize(clamp(initial, min, max)),
        },
    }
}
