// Ruta raíz (/): la pantalla de inicio es la lista de conexiones.
import { Navigate } from "react-router-dom";

const Home = () => <Navigate to="/connections" replace />;

export default Home;
