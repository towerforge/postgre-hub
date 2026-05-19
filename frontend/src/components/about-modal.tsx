import { useState, useEffect } from 'react'
import { Tag, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui'

declare const __APP_VERSION__: string

const GITHUB_REPO = 'towerforge/postgre-hub'
const GITHUB_URL  = `https://github.com/${GITHUB_REPO}`

const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--fill-1)', borderRadius: 'var(--radius-1)',
    padding: '10px 14px', border: '1px solid var(--stroke-1)',
}

interface Props { open: boolean; onClose: () => void }

export function AboutModal({ open, onClose }: Props) {
    const [latestVersion, setLatestVersion] = useState<string | null>(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
            .then(r => r.json())
            .then(d => setLatestVersion((d.tag_name as string)?.replace(/^v/, '') ?? null))
            .catch(() => null)
            .finally(() => setChecking(false))
    }, [])

    const hasUpdate = __APP_VERSION__ && latestVersion && __APP_VERSION__ !== latestVersion

    return (
        <Modal open={open} onClose={onClose} title="About">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <img src="/logo.svg" alt="Postgre Hub" style={{ width: 48, height: 48 }} />
                <div>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>Postgre Hub</p>
                    <a
                        href={GITHUB_URL} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', marginTop: 2 }}
                    >
                        {GITHUB_REPO} <ExternalLink size={10} />
                    </a>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={rowStyle}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                        <Tag size={13} />Current version
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>
                        {__APP_VERSION__}
                    </span>
                </div>

                {!checking && hasUpdate && (
                    <>
                        <div style={rowStyle}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
                                <RefreshCw size={13} />Latest release
                            </span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>
                                {latestVersion}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-1)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: '#f59e0b' }}>
                            <AlertCircle size={14} />
                            <span style={{ fontWeight: 500 }}>Update available</span>
                            <a
                                href={`${GITHUB_URL}/releases/latest`} target="_blank" rel="noreferrer"
                                style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                View release <ExternalLink size={10} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
