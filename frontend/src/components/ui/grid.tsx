import styles from "@/css/ui/grid.module.css"

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

interface GridProps {
    children: React.ReactNode
    gap?:     number
    align?:   "start" | "center" | "end" | "stretch"
    style?:   React.CSSProperties
}

interface ColProps {
    children: React.ReactNode
    span?:    Span
    sm?:      Span
    md?:      Span
    lg?:      Span
    style?:   React.CSSProperties
}

export function Grid({ children, gap = 12, align = "end", style }: GridProps) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap,
            alignItems: align,
            ...style,
        }}>
            {children}
        </div>
    )
}

export function Col({ children, span = 12, sm, md, lg, style }: ColProps) {
    const cls = [
        styles[`span-${span}`],
        sm  && styles[`sm-${sm}`],
        md  && styles[`md-${md}`],
        lg  && styles[`lg-${lg}`],
    ].filter(Boolean).join(" ")

    return (
        <div className={cls || undefined} style={style}>
            {children}
        </div>
    )
}
