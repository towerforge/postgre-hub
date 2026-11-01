// /dev ya no existe como pantalla: el catálogo del kit pasó a /design-system.
// Se conserva para no romper enlaces antiguos.
import { Navigate } from "react-router-dom";

const Dev = () => <Navigate to="/design-system" replace />;

export default Dev;
