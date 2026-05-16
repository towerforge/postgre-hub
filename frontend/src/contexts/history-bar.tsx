import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface HistoryBarCtx {
    content: ReactNode | null
    setContent: (n: ReactNode | null) => void
}

const Ctx = createContext<HistoryBarCtx>({
    content: null,
    setContent: () => {},
})

export function HistoryBarProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<ReactNode | null>(null)
    return <Ctx.Provider value={{ content, setContent }}>{children}</Ctx.Provider>
}

export const useHistoryBar = () => useContext(Ctx)

export function useSetHistoryBar(node: ReactNode | null, deps: unknown[]) {
    const { setContent } = useHistoryBar()
    const stableSet = useCallback((n: ReactNode | null) => setContent(n), [setContent])

    useEffect(() => {
        stableSet(node)
        return () => stableSet(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}
