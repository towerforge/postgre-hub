// Acciones de la pantalla abierta en la barra superior. La barra la pinta
// `MainLayout`, pero los botones (diagrama, exportar, importar…) los pone la
// pantalla abierta: este contexto es el hueco por el que se los pasa sin que el
// layout dependa de ninguna pantalla.
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToolbarContext = createContext({
  content: null,
  setContent: () => {},
});

export const ToolbarProvider = ({ children }) => {
  const [content, setContent] = useState(null);
  return (
    <ToolbarContext.Provider value={{ content, setContent }}>{children}</ToolbarContext.Provider>
  );
};

/** Contenido actual de la barra superior y su setter. */
export const useToolbar = () => useContext(ToolbarContext);

/** Mantiene `node` en la barra superior mientras el componente esté montado. */
export const useSetToolbar = (node, deps) => {
  const { setContent } = useToolbar();
  const stableSet = useCallback((n) => setContent(n), [setContent]);

  useEffect(() => {
    stableSet(node);
    return () => stableSet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
