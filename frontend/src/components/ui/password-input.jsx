// Campo de contraseña: un Input con un botón a la derecha para mostrarla u
// ocultarla. Acepta las mismas props que Input.
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { IconButton } from "./icon-button";

export const PasswordInput = (props) => {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      iconRight={
        <IconButton
          size="sm"
          label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </IconButton>
      }
    />
  );
};
