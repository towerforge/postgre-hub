import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface StatusBarCtx {
    content: ReactNode | null
    setContent: (n: ReactNode | null) => void
}

const Ctx = createContext<StatusBarCtx>({
    content: null,
    setContent: () => {},
})

export function StatusBarProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<ReactNode | null>(null)
    return <Ctx.Provider value={{ content, setContent }}>{children}</Ctx.Provider>
}

export const useStatusBar = () => useContext(Ctx)

/** Convenience: keep the statusbar synced with the given content while mounted. */
export function useSetStatusBar(node: ReactNode | null, deps: unknown[]) {
    const { setContent } = useStatusBar()
    const stableSet = useCallback((n: ReactNode | null) => setContent(n), [setContent])

    useEffect(() => {
        stableSet(node)
        return () => stableSet(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}
