import styles from "@/css/ui/text.module.css"

type TextVariant = "title" | "subtitle" | "body" | "caption" | "error" | "hint"
type TextAlign   = "left" | "center" | "right"

interface Props extends React.HTMLAttributes<HTMLElement> {
    variant?: TextVariant
    align?:   TextAlign
    as?:      React.ElementType
}

const defaultTag: Record<TextVariant, React.ElementType> = {
    title:    "h1",
    subtitle: "p",
    body:     "p",
    caption:  "span",
    error:    "p",
    hint:     "span",
}

export function Text({ variant = "body", align, as, className = "", ...props }: Props) {
    const Tag = as ?? defaultTag[variant]

    const cls = [
        styles[variant],
        align ? styles[align] : "",
        className,
    ].filter(Boolean).join(" ")

    return <Tag className={cls} {...props} />
}
