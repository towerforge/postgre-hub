// Contexto de visibilidad de los paneles (lateral izquierdo, lateral derecho e
// inferior). Los botones que los abren y cierran están en `MainLayout` y los
// paneles los pinta la pantalla de la conexión: el estado vive aquí para que
// ambos lados lo compartan.
import { createContext, useContext, useState } from "react";

const SidebarsContext = createContext({
  leftVisible: true,
  rightVisible: true,
  bottomVisible: false,
  toggleLeft: () => {},
  toggleRight: () => {},
  toggleBottom: () => {},
});

export const SidebarsProvider = ({ children }) => {
  const [leftVisible, setLeft] = useState(true);
  const [rightVisible, setRight] = useState(true);
  const [bottomVisible, setBottom] = useState(false);

  return (
    <SidebarsContext.Provider
      value={{
        leftVisible,
        rightVisible,
        bottomVisible,
        toggleLeft: () => setLeft((v) => !v),
        toggleRight: () => setRight((v) => !v),
        toggleBottom: () => setBottom((v) => !v),
      }}
    >
      {children}
    </SidebarsContext.Provider>
  );
};

/** Visibilidad de los tres paneles y sus conmutadores. */
export const useSidebars = () => useContext(SidebarsContext);
