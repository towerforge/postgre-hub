import { CheckCircle, AlertCircle, Info } from "lucide-react";
import styles from "@/css/ui/alert.module.css";

const ICON = { error: AlertCircle, success: CheckCircle, warning: AlertCircle, info: Info };

/** Mensaje de estado: error, éxito, aviso o información. Los errores se anuncian como `alert`. */
export const Alert = ({ tone = "error", className = "", children }) => {
  const Icon = ICON[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`${styles.alert} ${styles[tone]} ${className}`}
    >
      <Icon size={14} className={styles.icon} />
      <span className={styles.content}>{children}</span>
    </div>
  );
};
