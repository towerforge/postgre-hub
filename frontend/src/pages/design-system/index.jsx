// Design system (/design-system), solo para desarrollo: cada pieza de
// `@/components/ui` con sus variantes, tamaños y estados, para ver de un vistazo cómo
// queda y probarla sin montar una pantalla real. Empieza por la escala de alturas,
// que es la regla que comparten todos los controles. En producción redirige a
// /connections. Las secciones viven en las piezas `_*.jsx` de esta carpeta.
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button, Page } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";
import css from "@/css/design-system.module.css";
import { CatalogSizes } from "./_sizes";
import { CatalogTokens } from "./_tokens";
import { CatalogBrand } from "./_brand";
import { CatalogButtons } from "./_buttons";
import { CatalogForms } from "./_forms";
import { CatalogNavigation } from "./_navigation";
import { CatalogContent } from "./_content";
import { CatalogOverlays } from "./_overlays";
import { CatalogMenu } from "./_menu";

// Índice de secciones, en el mismo orden en que se pintan.
const SECTIONS = [
  { id: "sizes", label: "Sizes" },
  { id: "tokens", label: "Tokens" },
  { id: "brand", label: "Brand" },
  { id: "buttons", label: "Button" },
  { id: "inputs", label: "Inputs" },
  { id: "navigation", label: "Navigation" },
  { id: "content", label: "Content" },
  { id: "overlays", label: "Overlays" },
  { id: "menu", label: "Menu" },
];

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const DesignSystemCatalog = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("Design system");
  }, [setPageTitle]);

  return (
    <ConnectionsShell headerLeft="Design system" headerRight={null}>
      <Page maxWidth={1280}>
        <nav className={css.toc} aria-label="Sections">
          {SECTIONS.map(({ id, label }) => (
            <Button key={id} variant={7} onClick={() => scrollTo(id)}>
              {label}
            </Button>
          ))}
        </nav>
        <CatalogSizes />
        <CatalogTokens />
        <CatalogBrand />
        <CatalogButtons />
        <CatalogForms />
        <CatalogNavigation />
        <CatalogContent />
        <CatalogOverlays />
        <CatalogMenu />
      </Page>
    </ConnectionsShell>
  );
};

// La comprobación va en un componente aparte para que el catálogo pueda usar
// hooks sin llamarlos después de un return condicional.
const DesignSystemPage = () => {
  if (!import.meta.env.DEV) return <Navigate to="/connections" replace />;
  return <DesignSystemCatalog />;
};

export default DesignSystemPage;
