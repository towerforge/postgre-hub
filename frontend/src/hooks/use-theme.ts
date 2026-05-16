import { useEffect, useState } from "react"

export type Theme = "system" | "light" | "dark"

const STORAGE_KEY = "theme"

function applyTheme(theme: Theme) {
    const root = document.documentElement
    if (theme === "system") {
        root.removeAttribute("data-theme")
    } else {
        root.setAttribute("data-theme", theme)
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system"
    })

    useEffect(() => {
        applyTheme(theme)
    }, [theme])

    function setTheme(next: Theme) {
        localStorage.setItem(STORAGE_KEY, next)
        setThemeState(next)
    }

    return { theme, setTheme }
}
