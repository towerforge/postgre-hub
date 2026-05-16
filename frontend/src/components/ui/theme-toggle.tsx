import { Sun, Monitor, Moon } from "lucide-react"
import { useTheme, type Theme } from "@/hooks/use-theme"
import styles from "@/css/ui/theme-toggle.module.css"

const OPTIONS: { value: Theme; icon: React.ReactNode }[] = [
    { value: "light",  icon: <Sun size={14} /> },
    { value: "system", icon: <Monitor size={14} /> },
    { value: "dark",   icon: <Moon size={14} /> },
]

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <div className={styles.root}>
            {OPTIONS.map(opt => (
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
    )
}
