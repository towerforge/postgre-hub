import { NavLink, Outlet, useMatch } from 'react-router-dom'
import {
    PanelLeft, PanelRight, PanelBottom,
} from 'lucide-react'
import { useSidebars } from '@/contexts/sidebars'
import { usePageTitle } from '@/contexts/page-title'
import { useStatusBar } from '@/contexts/status-bar'
import { useHistoryBar } from '@/contexts/history-bar'
import styles from './MainLayout.module.css'

export default function MainLayout() {
    const projectMatch  = useMatch('/connections/:id/*')
    const { leftVisible, rightVisible, bottomVisible, toggleLeft, toggleRight, toggleBottom } = useSidebars()
    const { title, subtitle, accent } = usePageTitle()
    const { content: statusContent } = useStatusBar()
    const { content: historyContent } = useHistoryBar()

    return (
        <div className={styles.outerShell}>
            <div className="waybar">
                {projectMatch && (
                    <button
                        type="button"
                        onClick={toggleLeft}
                        title={leftVisible ? 'Ocultar barra lateral izquierda' : 'Mostrar barra lateral izquierda'}
                        className={`waybar-toggle${leftVisible ? ' active' : ''}`}
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
                            className={`waybar-toggle${rightVisible ? ' active' : ''}`}
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
                {projectMatch && (
                    <button
                        type="button"
                        onClick={toggleBottom}
                        title={bottomVisible ? 'Ocultar panel inferior' : 'Mostrar panel inferior'}
                        className={`statusbar-toggle${bottomVisible ? ' active' : ''}`}
                    >
                        <PanelBottom size={12} />
                        <span>[history]</span>
                    </button>
                )}
            </div>
        </div>
    )
}
