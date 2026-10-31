// Ruta antigua: la seguridad de la cuenta se movió a /account. Se conserva
// para no romper enlaces guardados.
import { Navigate } from "react-router-dom";

const Security = () => <Navigate to="/account" replace />;

export default Security;
