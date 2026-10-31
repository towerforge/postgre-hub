// Indicador de carga de texto: un carácter Braille que gira, a juego con la
// estética de terminal. `useSpinner` da solo el fotograma, para incrustarlo en
// otro texto (p. ej. el botón de ejecutar del editor SQL); `Spinner` lo pinta
// con su etiqueta.
import { useEffect, useRef, useState } from "react";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL_MS = 90;

/** Fotograma actual del spinner Braille; se detiene mientras `active` es false. */
export const useSpinner = (active = true) => {
  const [tick, setTick] = useState(0);
  const idRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (idRef.current !== null) {
        window.clearInterval(idRef.current);
        idRef.current = null;
      }
      return;
    }
    idRef.current = window.setInterval(() => setTick((t) => (t + 1) >>> 0), INTERVAL_MS);
    return () => {
      if (idRef.current !== null) {
        window.clearInterval(idRef.current);
        idRef.current = null;
      }
    };
  }, [active]);

  return FRAMES[tick % FRAMES.length];
};

/** `color` es el del glifo (verde por defecto), `size` su tamaño en px y `muted` atenúa la etiqueta. */
export const Spinner = ({ label, color = "var(--om-green)", size = 13, muted = true }) => {
  const frame = useSpinner(true);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
        fontSize: size,
        lineHeight: 1,
      }}
    >
      <span style={{ color, display: "inline-block", minWidth: "1ch", textAlign: "center" }}>
        {frame}
      </span>
      {label && <span style={{ color: muted ? "var(--om-fg-dim)" : "var(--om-fg)" }}>{label}</span>}
    </span>
  );
};
