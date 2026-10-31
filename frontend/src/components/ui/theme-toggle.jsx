// Selector de tema compacto (claro, sistema, oscuro) con un icono por opción.
// La aplicación del tema y su recuerdo los hace `useTheme`; esto es solo la
// botonera.
import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "./use-theme";
import styles from "@/css/ui/theme-toggle.module.css";

const OPTIONS = [
  { value: "light", icon: <Sun size={14} /> },
  { value: "system", icon: <Monitor size={14} /> },
  { value: "dark", icon: <Moon size={14} /> },
];

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.root}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`${styles.btn} ${theme === opt.value ? styles.active : ""}`}
          onClick={() => setTheme(opt.value)}
          aria-label={opt.value}
          title={opt.value}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
};
