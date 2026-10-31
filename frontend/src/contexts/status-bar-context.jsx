// Contexto de la barra de estado. La barra la pinta `MainLayout`, pero su
// contenido (modo solo lectura, pestañas, consulta en curso…) lo pone la
// pantalla abierta: este contexto es el hueco por el que se lo pasa sin que el
// layout dependa de ninguna pantalla.
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const StatusBarContext = createContext({
  content: null,
  setContent: () => {},
});

export const StatusBarProvider = ({ children }) => {
  const [content, setContent] = useState(null);
  return (
    <StatusBarContext.Provider value={{ content, setContent }}>
      {children}
    </StatusBarContext.Provider>
  );
};

/** Contenido actual de la barra de estado y su setter. */
export const useStatusBar = () => useContext(StatusBarContext);

/** Mantiene `node` en la barra de estado mientras el componente esté montado. */
export const useSetStatusBar = (node, deps) => {
  const { setContent } = useStatusBar();
  const stableSet = useCallback((n) => setContent(n), [setContent]);

  useEffect(() => {
    stableSet(node);
    return () => stableSet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
