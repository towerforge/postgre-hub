import styles from "@/css/ui/info-box.module.css";

/** Caja de información secundaria con fondo tenue. Con `mono` (por defecto) el texto va en monoespaciada: URL, ruta, comando… */
export const InfoBox = ({ mono = true, className = "", style, children }) => {
  return (
    <div className={`${styles.box} ${mono ? styles.mono : ""} ${className}`} style={style}>
      {children}
    </div>
  );
};
