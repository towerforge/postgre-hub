import styles from "@/css/ui/badge.module.css";

// Pastilla de contador (cambios pendientes, número de elementos…)
export const Badge = ({ tone = "accent", className = "", children }) => {
  return <span className={`${styles.badge} ${styles[tone]} ${className}`}>{children}</span>;
};
