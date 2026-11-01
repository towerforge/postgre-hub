// Raíz de la aplicación: proveedores de contexto, router y la separación entre
// la pantalla de acceso y el resto. Las rutas salen de los ficheros de
// `src/pages` (vite-plugin-pages) y todas comparten el `MainLayout`, que pinta
// la barra superior, las laterales y la de estado.
import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "~react-pages";
import { PageTitleProvider } from "@/contexts/page-title-context";
import { SidebarsProvider } from "@/contexts/sidebars-context";
import { StatusBarProvider } from "@/contexts/status-bar-context";
import { ToolbarProvider } from "@/contexts/toolbar-context";
import { HistoryBarProvider } from "@/contexts/history-bar-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";
import { AuthView } from "@/components/auth-view";

const AppRoutes = () => {
  // Cada página es un chunk aparte (importMode "async"): de ahí el Suspense
  const element = useRoutes([{ element: <MainLayout />, children: routes }]);
  return <Suspense fallback={null}>{element}</Suspense>;
};

// Sin sesión, cualquier URL muestra el acceso (o el alta del primer usuario)
const AppContent = () => {
  const { status, loading } = useAuth();
  if (loading) return null;

  if (!status?.authenticated) {
    return (
      <Routes>
        <Route path="/" element={<AuthView setupRequired={status?.setup_required ?? false} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <AppRoutes />;
};

const App = () => (
  <AuthProvider>
    <PageTitleProvider>
      <SidebarsProvider>
        <StatusBarProvider>
          <ToolbarProvider>
            <HistoryBarProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </HistoryBarProvider>
          </ToolbarProvider>
        </StatusBarProvider>
      </SidebarsProvider>
    </PageTitleProvider>
  </AuthProvider>
);

export default App;
