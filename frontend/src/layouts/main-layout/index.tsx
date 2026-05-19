import { useState } from 'react'
import { NavLink, Outlet, useMatch } from 'react-router-dom'
import {
    PanelLeft, PanelRight, PanelBottom, Info,
} from 'lucide-react'
import { useSidebars } from '@/contexts/sidebars'
import { usePageTitle } from '@/contexts/page-title'
import { useStatusBar } from '@/contexts/status-bar'
import { useHistoryBar } from '@/contexts/history-bar'
import { AboutModal } from '@/components/about-modal'
import styles from './MainLayout.module.css'

declare const __APP_VERSION__: string

export default function MainLayout() {
    const projectMatch  = useMatch('/connections/:id/*')
    const { leftVisible, rightVisible, bottomVisible, toggleLeft, toggleRight, toggleBottom } = useSidebars()
    const { title, subtitle, accent } = usePageTitle()
    const { content: statusContent } = useStatusBar()
    const { content: historyContent } = useHistoryBar()
    const [aboutOpen, setAboutOpen] = useState(false)

    return (
        <div className={styles.outerShell}>
            <div className="waybar">
                {projectMatch && (
                    <button
                        type="button"
                        onClick={toggleLeft}
                        title={leftVisible ? 'Ocultar barra lateral izquierda' : 'Mostrar barra lateral izquierda'}
                        className={`pos-btn toggle${leftVisible ? ' active' : ''}`}
                    >
                        <PanelLeft size={13} />
                        <span>[schema]</span>
                    </button>
                )}

                <NavLink to="/connections" className="title" title="Anar a connexions">
                    {title}
                    {subtitle && (
                        <>
                            <span className="sep">·</span>
                            <span style={{ color: accent || 'var(--om-green)' }}>{subtitle}</span>
                        </>
                    )}
                </NavLink>

                <div className="right">
                    {projectMatch && (
                        <button
                            type="button"
                            onClick={toggleRight}
                            title={rightVisible ? 'Ocultar barra lateral derecha' : 'Mostrar barra lateral derecha'}
                            className={`pos-btn toggle${rightVisible ? ' active' : ''}`}
                        >
                            <span>[inspector]</span>
                            <PanelRight size={13} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.middle}>
                <div id="left-sidebar-slot" className={styles.leftSlot} />

                <div className={styles.rightColumn}>
                    <div className={styles.body}>
                        <main className={styles.content}>
                            <Outlet />
                        </main>
                    </div>
                    {bottomVisible && historyContent && (
                        <div className={styles.bottomGap}>
                            <div className="tile bottombar">
                                {historyContent}
                            </div>
                        </div>
                    )}
                </div>

                <div id="right-sidebar-slot" className={styles.rightSlot} />
            </div>

            <div className="statusbar">
                {statusContent}
                <span className="sp" />
                {!projectMatch && (
                    <button
                        type="button"
                        onClick={() => setAboutOpen(true)}
                        title="About Postgre Hub"
                        className="pos-btn toggle"
                    >
                        <Info size={11} />
                        <span>[v{__APP_VERSION__}]</span>
                    </button>
                )}
                {projectMatch && (
                    <button
                        type="button"
                        onClick={toggleBottom}
                        title={bottomVisible ? 'Ocultar panel inferior' : 'Mostrar panel inferior'}
                        className={`pos-btn toggle${bottomVisible ? ' active' : ''}`}
                    >
                        <PanelBottom size={12} />
                        <span>[history]</span>
                    </button>
                )}
            </div>
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </div>
    )
}
