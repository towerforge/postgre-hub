// Contexto del panel inferior (historial de consultas). El panel lo pinta
// `MainLayout`, pero lo que muestra lo decide la pantalla abierta (el editor
// SQL): este contexto es el hueco por el que la pantalla le pasa su contenido
// sin que el layout sepa nada de ella.
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const HistoryBarContext = createContext({
  content: null,
  setContent: () => {},
});

export const HistoryBarProvider = ({ children }) => {
  const [content, setContent] = useState(null);
  return (
    <HistoryBarContext.Provider value={{ content, setContent }}>
      {children}
    </HistoryBarContext.Provider>
  );
};

/** Contenido actual del panel inferior y su setter. */
export const useHistoryBar = () => useContext(HistoryBarContext);

/** Mantiene `node` en el panel inferior mientras el componente esté montado. */
export const useSetHistoryBar = (node, deps) => {
  const { setContent } = useHistoryBar();
  const stableSet = useCallback((n) => setContent(n), [setContent]);

  useEffect(() => {
    stableSet(node);
    return () => stableSet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
