import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "./input"
import { IconButton } from "./icon-button"

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "iconRight">

// Input de contraseña con botón para mostrarla u ocultarla
export function PasswordInput(props: Props) {
    const [show, setShow] = useState(false)
    return (
        <Input
            {...props}
            type={show ? "text" : "password"}
            iconRight={
                <IconButton size="sm" label={show ? "Hide password" : "Show password"} onClick={() => setShow(s => !s)}>
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconButton>
            }
        />
    )
}
