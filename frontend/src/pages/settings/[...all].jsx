// Rutas antiguas /settings/*: los ajustes pasaron a tener ruta propia
// (/account, /users, /ssh-tunnels). Redirige cada una a su sitio nuevo para no
// romper enlaces guardados.
import { Navigate, useParams } from "react-router-dom";

const MOVED = {
  account: "/account",
  security: "/account",
  users: "/users",
  "ssh-tunnels": "/ssh-tunnels",
};

const SettingsRedirect = () => {
  const { "*": rest = "" } = useParams();
  return <Navigate to={MOVED[rest] ?? "/account"} replace />;
};

export default SettingsRedirect;
