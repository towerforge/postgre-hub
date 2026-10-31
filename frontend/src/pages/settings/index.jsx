// /settings sin más: redirige a la cuenta, que es lo que mostraba antes.
import { Navigate } from "react-router-dom";

const Settings = () => <Navigate to="/account" replace />;

export default Settings;
