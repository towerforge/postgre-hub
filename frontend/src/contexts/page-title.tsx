import { createContext, useContext, useEffect, useState } from 'react'

interface PageTitleCtx {
    title: string
    subtitle: string
    setPageTitle: (title: string, subtitle?: string) => void
}

const Ctx = createContext<PageTitleCtx>({
    title: 'Postgre Hub',
    subtitle: '',
    setPageTitle: () => {},
})

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const [title,    setTitle]    = useState('Postgre Hub')
    const [subtitle, setSubtitle] = useState('')

    const setPageTitle = (t: string, s = '') => { setTitle(t); setSubtitle(s) }

    useEffect(() => {
        document.title = title && title !== 'Postgre Hub' ? title : 'postgre-hub'
    }, [title])

    return <Ctx.Provider value={{ title, subtitle, setPageTitle }}>{children}</Ctx.Provider>
}

export const usePageTitle = () => useContext(Ctx)
