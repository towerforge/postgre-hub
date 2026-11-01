// Avatar del kit: círculo con la inicial de un nombre. Es decorativo (aria-hidden):
// el nombre siempre va escrito al lado, así que el lector de pantalla no lo repite.
// `size` sigue la escala de controles: el avatar cabe dentro de un control de ese
// tamaño con aire alrededor (lg 20px dentro de 32, xl 24px dentro de 38).
import styles from "@/css/ui/avatar.module.css";

const SIZES = ["lg", "xl"];

/** `name`: de donde sale la inicial ("?" si falta). `size`: lg (por defecto) o xl. */
export const Avatar = ({ name, size = "lg", className = "" }) => (
  <span
    className={`${styles.avatar} ${styles[SIZES.includes(size) ? size : "lg"]} ${className}`}
    aria-hidden="true"
  >
    {(name || "?").trim().slice(0, 1).toUpperCase() || "?"}
  </span>
);
