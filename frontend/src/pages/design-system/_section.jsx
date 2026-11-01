// Catálogo del kit (/design-system), piezas de maquetación comunes: CatalogSection agrupa
// una familia de componentes, CatalogRow rotula cada fila de ejemplos (y su tamaño si no
// es el de por defecto), SizeCompare enseña lg y xl lado a lado en columnas rotuladas,
// SizeProbe envuelve un control para medirlo y useCssVars lee tokens de index.css. Así
// las secciones no repiten a mano títulos, márgenes ni estilos en línea.
//
// Regla del catálogo: fuera de Sizes, cada fila va entera en un solo tamaño. Si es lg (el
// de por defecto) no se rotula; si es xl, CatalogRow lleva `size="xl"`. Los dos tamaños
// juntos solo aparecen en un SizeCompare, al final de la sección.
import { useSyncExternalStore } from "react";
import { Text } from "@/components/ui";
import css from "@/css/design-system.module.css";

/** Escala de alturas del kit, en el orden en que se muestra en todo el catálogo. */
export const SIZES = ["lg", "xl"];

/** Sección del catálogo: título, descripción opcional y filas debajo. `id` es el ancla del índice. */
export const CatalogSection = ({ id, title, description, children }) => (
  <section id={id} className={css.section}>
    <header className={css.sectionHead}>
      <Text variant="body" as="h2" className={css.heading}>
        {title}
      </Text>
      {description && (
        <Text variant="hint" as="p" className={css.description}>
          {description}
        </Text>
      )}
    </header>
    {children}
  </section>
);

const SIZE_TOKENS = SIZES.map((s) => `--control-h-${s}`);

/** Rótulo de tamaño: el nombre en mono y el alto leído del token ("xl 38px"). */
export const SizeTag = ({ size }) => {
  const heights = useCssVars(SIZE_TOKENS);
  return (
    <span className={css.sizeTag}>
      <code>{size}</code>
      {heights[`--control-h-${size}`]}
    </span>
  );
};

/**
 * Fila rotulada: el rótulo encima y los ejemplos en línea, alineados al centro.
 * `size` solo se pasa cuando la fila entera va en un tamaño distinto del de por defecto
 * (p. ej. "xl" en los formularios de modal); entonces el rótulo lleva su SizeTag.
 */
export const CatalogRow = ({ label, size, children }) => (
  <div className={css.row} data-ds-row-size={size}>
    {(label || size) && (
      <span className={css.rowLabel}>
        {label}
        {size && <SizeTag size={size} />}
      </span>
    )}
    <div className={css.rowBody}>{children}</div>
  </div>
);

/**
 * Comparación de tamaños: rejilla de tres columnas (control | lg | xl), una fila por
 * control. Es el único sitio, fuera de Sizes, donde conviven las dos alturas, y cada
 * columna lleva su SizeTag en la cabecera. `items`: { key, name, use?, number?,
 * field?, render(size) }; `field` da un ancho fijo a los campos para que no se estiren.
 */
export const SizeCompare = ({ label = "lg and xl side by side", items }) => (
  <div className={css.row}>
    <span className={css.rowLabel}>{label}</span>
    <div className={css.matrixScroll} data-ds-compare="">
      <div className={css.matrix} role="table" aria-label={label}>
        <div role="row" className={css.matrixRow}>
          <span role="columnheader" className={css.matrixCorner}>
            {items.some((i) => i.number) ? "variant" : "control"}
          </span>
          {SIZES.map((s) => (
            <span key={s} role="columnheader" className={css.matrixHead}>
              <SizeTag size={s} />
            </span>
          ))}
        </div>
        {items.map((item) => (
          <div key={item.key ?? item.name} role="row" className={css.matrixRow}>
            <span role="rowheader" className={css.matrixName}>
              {item.number && <span className={css.variantNumber}>{item.number}</span>}
              <span>
                <span className={css.variantName}>{item.name}</span>
                {item.use && <span className={css.variantUse}>{item.use}</span>}
              </span>
            </span>
            {SIZES.map((s) => (
              <span key={s} role="cell" className={css.matrixCell} data-ds-compare-size={s}>
                {item.field ? (
                  <span className={css.compareField}>{item.render(s)}</span>
                ) : (
                  item.render(s)
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Envoltorio de medida: no añade caja propia, así que su alto es el del control que
 * contiene. Lleva `data-ds-size` para que el verificador lo encuentre y lo mida.
 * `field` le da un ancho fijo a los campos, que si no se estirarían.
 */
export const SizeProbe = ({ size, name, field = false, children }) => (
  <span
    className={`${css.probe} ${field ? css.probeField : ""}`}
    data-ds-size={size}
    data-ds-control={name}
  >
    {children}
  </span>
);

// Suscripción a los cambios de tema: el atributo data-theme de <html> y la
// preferencia del sistema. Con eso los valores leídos se refrescan solos.
const subscribe = (onChange) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
};

/**
 * Lee de :root el valor computado de cada variable CSS de `names` y devuelve un
 * objeto { nombre: valor }. Se recalcula al cambiar de tema.
 */
export const useCssVars = (names) => {
  const key = names.join(",");
  const snapshot = useSyncExternalStore(subscribe, () => {
    const cs = getComputedStyle(document.documentElement);
    return key
      .split(",")
      .map((n) => cs.getPropertyValue(n).trim())
      .join("|");
  });
  const values = snapshot.split("|");
  return Object.fromEntries(names.map((n, i) => [n, values[i] ?? ""]));
};
