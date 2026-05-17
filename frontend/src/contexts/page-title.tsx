import { createContext, useContext, useEffect, useState } from 'react'

interface PageTitleCtx {
    title: string
    subtitle: string
    accent: string
    setPageTitle: (title: string, subtitle?: string, accent?: string) => void
}

const Ctx = createContext<PageTitleCtx>({
    title: 'Postgre Hub',
    subtitle: '',
    accent: '',
    setPageTitle: () => {},
})

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
    const [title,    setTitle]    = useState('Postgre Hub')
    const [subtitle, setSubtitle] = useState('')
    const [accent,   setAccent]   = useState('')

    const setPageTitle = (t: string, s = '', a = '') => {
        setTitle(t); setSubtitle(s); setAccent(a)
    }

    useEffect(() => {
        document.title = title && title !== 'Postgre Hub' ? title : 'postgre-hub'
    }, [title])

    return <Ctx.Provider value={{ title, subtitle, accent, setPageTitle }}>{children}</Ctx.Provider>
}

export const usePageTitle = () => useContext(Ctx)
