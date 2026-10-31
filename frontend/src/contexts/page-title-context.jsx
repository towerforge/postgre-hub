// Contexto del título de la pantalla. La barra superior de `MainLayout` muestra
// el título de la pantalla abierta (o el nombre de la conexión), un subtítulo y
// el color de acento; quien los conoce es la página, así que los publica aquí.
// De paso mantiene sincronizado el título de la pestaña del navegador.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const PageTitleContext = createContext({
  title: "Postgre Hub",
  subtitle: "",
  accent: "",
  setPageTitle: () => {},
});

export const PageTitleProvider = ({ children }) => {
  const [title, setTitle] = useState("Postgre Hub");
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState("");

  // Estable entre renders: las páginas lo ponen en las dependencias de sus efectos
  const setPageTitle = useCallback((t, s = "", a = "") => {
    setTitle(t);
    setSubtitle(s);
    setAccent(a);
  }, []);

  useEffect(() => {
    document.title = title && title !== "Postgre Hub" ? title : "postgre-hub";
  }, [title]);

  return (
    <PageTitleContext.Provider value={{ title, subtitle, accent, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

/** Título, subtítulo y acento actuales, y `setPageTitle(título, subtítulo, acento)`. */
export const usePageTitle = () => useContext(PageTitleContext);
