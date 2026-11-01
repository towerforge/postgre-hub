// Contexto del título de la pantalla. La barra superior de `MainLayout` muestra
// el título de la pantalla abierta (o el nombre de la conexión), un subtítulo, el
// color de acento y el entorno; quien los conoce es la página, así que los
// publica aquí.
// De paso mantiene sincronizado el título de la pestaña del navegador.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const PageTitleContext = createContext({
  title: "Postgre Hub",
  subtitle: "",
  accent: "",
  environment: "",
  setPageTitle: () => {},
});

export const PageTitleProvider = ({ children }) => {
  const [title, setTitle] = useState("Postgre Hub");
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState("");
  const [environment, setEnvironment] = useState("");

  // Estable entre renders: las páginas lo ponen en las dependencias de sus efectos
  const setPageTitle = useCallback((t, s = "", a = "", env = "") => {
    setTitle(t);
    setSubtitle(s);
    setAccent(a);
    setEnvironment(env);
  }, []);

  useEffect(() => {
    document.title = title && title !== "Postgre Hub" ? title : "postgre-hub";
  }, [title]);

  return (
    <PageTitleContext.Provider value={{ title, subtitle, accent, environment, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
};

/** Título, subtítulo, acento y entorno actuales, y `setPageTitle(título, subtítulo, acento, entorno)`. */
export const usePageTitle = () => useContext(PageTitleContext);
