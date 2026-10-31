import styles from "@/css/ui/text.module.css";

const DEFAULT_TAG = {
  title: "h1",
  subtitle: "p",
  body: "p",
  caption: "span",
  error: "p",
  hint: "span",
};

/** Texto tipográfico. `variant` (title, subtitle, body, caption, error, hint) fija estilo y etiqueta; `as` cambia la etiqueta y `align` es left, center o right. */
export const Text = ({ variant = "body", align, as, className = "", ...props }) => {
  const Tag = as ?? DEFAULT_TAG[variant];

  const cls = [styles[variant], align ? styles[align] : "", className].filter(Boolean).join(" ");

  return <Tag className={cls} {...props} />;
};
