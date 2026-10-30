import styles from "@/css/ui/info-box.module.css"

interface Props {
    /** Texto en monoespaciada (URL, ruta, comando…) */
    mono?: boolean
    className?: string
    style?: React.CSSProperties
    children: React.ReactNode
}

// Caja de información secundaria con fondo tenue
export function InfoBox({ mono = true, className = "", style, children }: Props) {
    return (
        <div className={`${styles.box} ${mono ? styles.mono : ""} ${className}`} style={style}>
            {children}
        </div>
    )
}
