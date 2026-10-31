// /login ya no existe como pantalla: el acceso se muestra en cualquier URL
// cuando no hay sesión. Se conserva para no romper enlaces antiguos.
import { Navigate } from "react-router-dom";

const Login = () => <Navigate to="/" replace />;

export default Login;
