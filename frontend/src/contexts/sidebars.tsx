import { createContext, useContext, useState } from 'react'

interface SidebarsCtx {
    leftVisible: boolean
    rightVisible: boolean
    bottomVisible: boolean
    toggleLeft: () => void
    toggleRight: () => void
    toggleBottom: () => void
}

const Ctx = createContext<SidebarsCtx>({
    leftVisible: true,
    rightVisible: true,
    bottomVisible: false,
    toggleLeft: () => {},
    toggleRight: () => {},
    toggleBottom: () => {},
})

export function SidebarsProvider({ children }: { children: React.ReactNode }) {
    const [leftVisible,   setLeft]   = useState(true)
    const [rightVisible,  setRight]  = useState(true)
    const [bottomVisible, setBottom] = useState(false)

    return (
        <Ctx.Provider value={{
            leftVisible,
            rightVisible,
            bottomVisible,
            toggleLeft:   () => setLeft(v => !v),
            toggleRight:  () => setRight(v => !v),
            toggleBottom: () => setBottom(v => !v),
        }}>
            {children}
        </Ctx.Provider>
    )
}

export const useSidebars = () => useContext(Ctx)
