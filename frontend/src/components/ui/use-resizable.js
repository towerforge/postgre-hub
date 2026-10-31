// Hook del kit para paneles redimensionables: lleva el tamaño de un panel que se
// ajusta arrastrando un Splitter, con límites, y lo recuerda en localStorage por
// clave para que el diseño sobreviva a recargar. Guarda al soltar, no en cada
// movimiento, para no escribir en el almacenamiento decenas de veces por segundo.
import { useEffect, useRef, useState } from "react";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const readStored = (key, fallback) => {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Tamaño de un panel que se ajusta arrastrando un separador; doble clic lo restaura.
 * `axis` es el eje del arrastre ("x" o "y") e `invert` invierte el sentido (panel
 * anclado a la derecha o abajo). Devuelve `{ size, dragging, handleProps }`;
 * `handleProps` va al Splitter.
 */
export const useResizable = ({ key, initial, min, max, axis, invert = false }) => {
  const storageKey = `panel-size:${key}`;
  const [size, setSize] = useState(() => clamp(readStored(storageKey, initial), min, max));
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);

  const pos = (e) => (axis === "x" ? e.clientX : e.clientY);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    start.current = { pos: pos(e), size };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e) => {
    if (!start.current) return;
    const delta = pos(e) - start.current.pos;
    setSize(clamp(start.current.size + (invert ? -delta : delta), min, max));
  };

  const onPointerUp = (e) => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Durante el arrastre: cursor fijo y sin selección de texto en toda la página
  useEffect(() => {
    if (!dragging) return;
    const cls = axis === "x" ? "resizing-x" : "resizing-y";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [dragging, axis]);

  // Se guarda al soltar, no en cada movimiento
  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(storageKey, String(Math.round(size)));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [dragging, size, storageKey]);

  return {
    size,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick: () => setSize(clamp(initial, min, max)),
    },
  };
};
