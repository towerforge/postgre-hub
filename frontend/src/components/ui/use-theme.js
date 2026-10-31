// Hook del tema claro/oscuro: lo aplica como `data-theme` en <html> (sin el
// atributo manda `prefers-color-scheme`, que es el modo «system») y lo recuerda
// en localStorage.
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
};

/** Tema elegido ("light", "dark" o "system") y su setter, que lo aplica y lo guarda. */
export const useTheme = () => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "system";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  return { theme, setTheme };
};
