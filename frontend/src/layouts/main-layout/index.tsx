import { useState } from 'react'
import { NavLink, Outlet, useMatch } from 'react-router-dom'
import {
    PanelLeft, PanelRight, PanelBottom, Info, ChevronDown, Database,
} from 'lucide-react'
import { useSidebars } from '@/contexts/sidebars'
import { usePageTitle } from '@/contexts/page-title'
import { useStatusBar } from '@/contexts/status-bar'
import { useHistoryBar } from '@/contexts/history-bar'
import { AboutModal } from '@/components/about-modal'
import { initialsOf } from '@/components/projects-shell'
import { Splitter, ToolButton } from '@/components/ui'
import { useResizable } from '@/hooks/use-resizable'
import styles from './MainLayout.module.css'

declare const __APP_VERSION__: string

export default function MainLayout() {
    const projectMatch  = useMatch('/connections/:id/*')
    const { leftVisible, rightVisible, bottomVisible, toggleLeft, toggleRight, toggleBottom } = useSidebars()
    const { title, subtitle, accent } = usePageTitle()
    const { content: statusContent } = useStatusBar()
    const { content: historyContent } = useHistoryBar()
    const [aboutOpen, setAboutOpen] = useState(false)
    const history = useResizable({ key: 'history', initial: 180, min: 90, max: 600, axis: 'y', invert: true })

    // Brillo en la esquina superior izquierda con el color de la conexión abierta
    // En el listado de conexiones el foco es azul y más intenso
    const glow = projectMatch && accent
        ? { backgroundImage: `radial-gradient(ellipse 900px 380px at 0% 0%, color-mix(in srgb, ${accent} var(--om-glow), transparent), transparent 75%)` }
        : !projectMatch
            ? { backgroundImage: 'radial-gradient(ellipse 1100px 560px at 0% 0%, color-mix(in srgb, #3574f0 55%, transparent), transparent 72%)' }
            : undefined

    return (
        <div className={styles.outerShell} style={glow}>
            <div className="waybar">
                {projectMatch && (
                    <ToolButton
                        iconOnly
                        active={leftVisible}
                        onClick={toggleLeft}
                        title={leftVisible ? 'Ocultar barra lateral izquierda' : 'Mostrar barra lateral izquierda'}
                    >
                        <PanelLeft size={16} />
                    </ToolButton>
                )}

                {/* Widget de proyecto: vuelve a la lista de conexiones */}
                <NavLink to="/connections" className="title" title="Ir a conexiones">
                    <span className="proj-icon" style={{ background: projectMatch ? (accent || 'var(--om-primary)') : 'var(--om-primary)' }}>
                        {projectMatch ? initialsOf(title) : <Database size={13} />}
                    </span>
                    <span>{title}</span>
                    {subtitle && <span className="sub">{subtitle}</span>}
                    <ChevronDown size={14} className="chev" />
                </NavLink>

                <span className="sp" />

                <div className="right">
                    {projectMatch && (
                        <ToolButton
                            iconOnly
                            active={rightVisible}
                            onClick={toggleRight}
                            title={rightVisible ? 'Ocultar barra lateral derecha' : 'Mostrar barra lateral derecha'}
                        >
                            <PanelRight size={16} />
                        </ToolButton>
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
                            <Splitter orientation="horizontal" dragging={history.dragging} handleProps={history.handleProps} />
                            <div className="tile bottombar" style={{ height: history.size, flex: 'none' }}>
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
                    <ToolButton
                        iconOnly
                        size="sm"
                        onClick={() => setAboutOpen(true)}
                        title="About Postgre Hub"
                    >
                        <Info size={13} />
                        <span>v{__APP_VERSION__}</span>
                    </ToolButton>
                )}
                {projectMatch && (
                    <ToolButton
                        iconOnly
                        size="sm"
                        active={bottomVisible}
                        onClick={toggleBottom}
                        title={bottomVisible ? 'Ocultar panel inferior' : 'Mostrar panel inferior'}
                    >
                        <PanelBottom size={14} />
                        <span>History</span>
                    </ToolButton>
                )}
            </div>
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </div>
    )
}
