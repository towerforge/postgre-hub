// Contexto de autenticación: sabe si la instalación aún necesita su primer
// administrador (`setup_required`), si hay sesión y con qué usuario. Existe para
// que `app.jsx` decida entre la pantalla de acceso y la app sin que cada página
// vuelva a preguntar a la API; las llamadas en sí están en services/auth.
// También expone `desktop`: si la SPA corre dentro de la app de escritorio
// (Tauri), según el mismo `/api/auth/status`. Va aparte de `status` porque
// entrar y salir reescriben `status` y el modo no cambia en toda la sesión.
import { createContext, useContext, useEffect, useState } from "react";
import {
  apiAuthStatus,
  apiAuthSetup,
  apiAuthLogin,
  apiAuthLogout,
  apiAuthMe,
} from "@/services/auth";
import { setupServiceWorker } from "@/services/service-worker";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [username, setUsername] = useState("");
  const [desktop, setDesktop] = useState(false);
  const [loading, setLoading] = useState(true);

  // El nombre de usuario se pide aparte y sin bloquear: si falla, la sesión
  // sigue siendo válida y solo se queda sin mostrar el nombre.
  const refresh = async () => {
    try {
      const data = await apiAuthStatus();
      setStatus(data);
      setDesktop(data.desktop === true);
      setupServiceWorker(data.desktop === true).catch(() => {});
      if (data.authenticated) {
        apiAuthMe()
          .then((me) => setUsername(me.username))
          .catch(() => {});
      }
    } catch {
      // Sin respuesta del estado se asume instalación nueva y se muestra el alta.
      setStatus({ setup_required: true, authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // `beforeEnter` (opcional) se espera tras autenticar y antes de cambiar el
  // estado: deja a la pantalla de acceso terminar su animación de salida.
  const setup = async (u, password, confirmPassword, beforeEnter) => {
    await apiAuthSetup(u, password, confirmPassword);
    await beforeEnter?.();
    setStatus({ setup_required: false, authenticated: true });
    apiAuthMe()
      .then((me) => setUsername(me.username))
      .catch(() => {});
  };

  const login = async (u, password, beforeEnter) => {
    await apiAuthLogin(u, password);
    await beforeEnter?.();
    setStatus({ setup_required: false, authenticated: true });
    apiAuthMe()
      .then((me) => setUsername(me.username))
      .catch(() => {});
  };

  const logout = async () => {
    await apiAuthLogout();
    setStatus({ setup_required: false, authenticated: false });
    setUsername("");
  };

  return (
    <AuthContext.Provider
      value={{ status, username, loading, desktop, setup, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Estado de sesión y acciones de acceso; solo dentro de `<AuthProvider>`. */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
