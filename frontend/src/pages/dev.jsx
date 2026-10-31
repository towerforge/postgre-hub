// Catálogo de componentes del kit (/dev), solo para desarrollo: cada pieza de
// `@/components/ui` con sus variantes, para ver de un vistazo cómo queda y
// probarla sin montar una pantalla real. En producción redirige a
// /connections. Las secciones viven en las piezas `_dev-*.jsx` de al lado.
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Page, Text } from "@/components/ui";
import { ConnectionsShell } from "@/components/connections-shell";
import { usePageTitle } from "@/contexts/page-title-context";
import { DevButtons } from "./_dev-buttons";
import { DevContent } from "./_dev-content";
import { DevControls } from "./_dev-controls";
import { DevForms } from "./_dev-forms";
import { DevPanels } from "./_dev-panels";

const DevCatalog = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("UI components");
  }, [setPageTitle]);

  return (
    <ConnectionsShell headerLeft="UI components" headerRight={null}>
      <Page>
        <Text variant="title">Componentes UI</Text>
        <Text variant="subtitle">Ejemplo de la librería base</Text>
        <DevButtons />
        <DevContent />
        <DevControls />
        <DevForms />
        <DevPanels />
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
