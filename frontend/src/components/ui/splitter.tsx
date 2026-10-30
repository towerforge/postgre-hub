import type { CSSProperties, PointerEventHandler, MouseEventHandler } from 'react'

interface Props {
    /** vertical: separa columnas (se arrastra en horizontal); horizontal: separa filas */
    orientation: 'vertical' | 'horizontal'
    dragging?: boolean
    handleProps: {
        onPointerDown: PointerEventHandler<HTMLElement>
        onPointerMove: PointerEventHandler<HTMLElement>
        onPointerUp: PointerEventHandler<HTMLElement>
        onPointerCancel: PointerEventHandler<HTMLElement>
        onDoubleClick: MouseEventHandler<HTMLElement>
    }
    style?: CSSProperties
}

// Separador arrastrable que ocupa el hueco entre dos islas
export function Splitter({ orientation, dragging, handleProps, style }: Props) {
    return (
        <div
            role="separator"
            aria-orientation={orientation}
            title="Drag to resize · double-click to reset"
            className={`splitter ${orientation}${dragging ? ' dragging' : ''}`}
            style={style}
            {...handleProps}
        />
    )
}
