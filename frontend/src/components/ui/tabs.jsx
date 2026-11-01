// Pestañas del kit: Tabs guarda la pestaña activa (controlada con `value` o
// interna con `defaultTab`) y la comparte por contexto con TabBar, Tab y
// TabPanel, que pueden ir anidados donde haga falta sin pasar props a mano.
import { createContext, useContext, useState } from "react";
import styles from "@/css/ui/tabs.module.css";

const Ctx = createContext(null);

const SIZES = ["lg", "xl"];

const useTabsCtx = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Tabs subcomponents must be used inside <Tabs>");
  return ctx;
};

/**
 * Raíz de las pestañas; `onChange` recibe el `id` de la pestaña elegida. `size`
 * (lg 32px por defecto, xl 38px) es el alto de todas sus pestañas.
 */
export const Tabs = ({
  defaultTab = "",
  value,
  onChange,
  size = "lg",
  className = "",
  children,
}) => {
  const [internal, setInternal] = useState(defaultTab);
  const active = value !== undefined ? value : internal;
  const setActive = (id) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  return (
    <Ctx.Provider value={{ active, setActive, size }}>
      <div className={`${styles.root} ${className}`}>{children}</div>
    </Ctx.Provider>
  );
};

/** Barra de pestañas; `actions` va a la derecha. */
export const TabBar = ({ actions, className = "", children }) => {
  return (
    <div className={`${styles.bar} ${className}`}>
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

/** Pestaña. `badge` muestra un contador y `dot` un punto de estado; `size` sustituye al de Tabs. */
export const Tab = ({ id, icon, badge, dot, size, disabled = false, className = "", children }) => {
  const { active, setActive, size: ctxSize } = useTabsCtx();
  const s = size ?? ctxSize;
  const sizeClass = styles[SIZES.includes(s) ? s : "lg"];
  const isActive = active === id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActive(id)}
      className={`${styles.tab} ${sizeClass} ${isActive ? styles.active : ""} ${className}`}
    >
      {icon}
      {children}
      {dot && <span className={styles.dot} />}
      {badge !== undefined && <span className={styles.badge}>{badge}</span>}
    </button>
  );
};

/** Contenido de la pestaña `id`; solo se monta mientras está activa. */
export const TabPanel = ({ id, className = "", children }) => {
  const { active } = useTabsCtx();
  if (active !== id) return null;
  return (
    <div role="tabpanel" className={`${styles.panel} ${className}`}>
      {children}
    </div>
  );
};
