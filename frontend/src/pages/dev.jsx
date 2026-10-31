// Catálogo de componentes del kit (/dev), solo para desarrollo: cada pieza de
// `@/components/ui` con sus variantes, para ver de un vistazo cómo queda y
// probarla sin montar una pantalla real. En producción redirige a
// /connections. Las secciones viven en las piezas `_dev-*.jsx` de al lado.
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Page } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";
import { DevButtons } from "./_dev-buttons";
import { DevContent } from "./_dev-content";
import { DevForms } from "./_dev-forms";
import { DevNavigation } from "./_dev-navigation";
import { DevOverlays } from "./_dev-overlays";

const DevCatalog = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("UI components");
  }, [setPageTitle]);

  return (
    <ConnectionsShell headerLeft="UI components" headerRight={null}>
      <Page>
        <DevButtons />
        <DevForms />
        <DevNavigation />
        <DevContent />
        <DevOverlays />
      </Page>
    </ConnectionsShell>
  );
};

// La comprobación va en un componente aparte para que el catálogo pueda usar
// hooks sin llamarlos después de un return condicional.
const DevPage = () => {
  if (!import.meta.env.DEV) return <Navigate to="/connections" replace />;
  return <DevCatalog />;
};

export default DevPage;
