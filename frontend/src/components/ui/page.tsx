type Size = 1 | 2 | 3 | 4

const PADDING: Record<Size, string> = {
    1: "12px 16px",
    2: "24px 20px",
    3: "40px 32px",
    4: "64px 48px",
}

interface Props {
    children: React.ReactNode
    maxWidth?: number | "full"
    size?: Size
}

export function Page({ children, maxWidth = 960, size = 2 }: Props) {
    const style: React.CSSProperties = {
        padding: PADDING[size],
        ...(maxWidth !== "full" && { maxWidth, margin: "0 auto" }),
    }
    return <div style={style}>{children}</div>
}
