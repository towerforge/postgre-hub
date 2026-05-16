import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { PageTitleProvider } from '@/contexts/page-title'
import { SidebarsProvider } from '@/contexts/sidebars'
import { StatusBarProvider } from '@/contexts/status-bar'
import { HistoryBarProvider } from '@/contexts/history-bar'
import { AuthProvider, useAuth } from '@/contexts/auth'
import MainLayout from '@/layouts/main-layout'
import { AuthView } from '@/components/auth/auth-view'
import ConnectionsList from '@/pages/connections/list'
import QueryEditor from '@/pages/query-editor'
import AccountPage from '@/pages/settings/account'
import UsersPage from '@/pages/settings/users'
import SshTunnelsPage from '@/pages/ssh-tunnels'

const Dev = import.meta.env.DEV ? lazy(() => import('@/pages/dev')) : null

function AppRoutes() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/connections" replace />} />
                <Route path="/connections" element={<ConnectionsList />} />
                <Route path="/connections/:id" element={<QueryEditor />} />
                <Route path="/ssh-tunnels" element={<SshTunnelsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/users"   element={<UsersPage />} />
                <Route path="/settings" element={<Navigate to="/account" replace />} />
                <Route path="/settings/account"     element={<Navigate to="/account" replace />} />
                <Route path="/settings/users"       element={<Navigate to="/users" replace />} />
                <Route path="/settings/ssh-tunnels" element={<Navigate to="/ssh-tunnels" replace />} />
                <Route path="/security"          element={<Navigate to="/account" replace />} />
                <Route path="/settings/security" element={<Navigate to="/account" replace />} />
                {Dev && <Route path="/_dev" element={<Suspense><Dev /></Suspense>} />}
                {!import.meta.env.DEV && <Route path="/_dev" element={<Navigate to="/connections" replace />} />}
            </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function AppContent() {
    const { status, loading } = useAuth()
    const isAuthed      = status?.authenticated ?? false
    const setupRequired = status?.setup_required ?? false
    const showOverlay   = !loading && !isAuthed

    return (
        <>
            <AppRoutes />

            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        key="login-overlay"
                        initial={{ y: 0 }}
                        exit={{ y: '-100vh' }}
                        transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'var(--om-gap)',
                            overflow: 'hidden',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
                        }}
                    >
                        <AuthView
                            setupRequired={setupRequired}
                            onAuthenticated={() => { /* status will flip, triggering exit */ }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function App() {
    return (
        <AuthProvider>
        <PageTitleProvider>
        <SidebarsProvider>
        <StatusBarProvider>
        <HistoryBarProvider>
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
        </HistoryBarProvider>
        </StatusBarProvider>
        </SidebarsProvider>
        </PageTitleProvider>
        </AuthProvider>
    )
}

export default App
