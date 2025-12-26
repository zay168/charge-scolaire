/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APP LAYOUT
 * Main layout wrapper with sidebar for authenticated users
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { ReloginModal } from '../auth/ReloginModal';
import './AppLayout.css';

export function AppLayout() {
    const { isAuthenticated, isLoading, showReloginModal, closeReloginModal, triggerRelogin } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Expose triggerRelogin globally for API error handlers
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__triggerRelogin = triggerRelogin;
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.__triggerRelogin;
            }
        };
    }, [triggerRelogin]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="app-layout__loader">
                <div className="app-layout__loader-spinner"></div>
                <p>Chargement...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'app-layout--collapsed' : ''} ${sidebarOpen ? 'app-layout--sidebar-open' : ''}`}>
            {/* Mobile header with hamburger */}
            <header className="app-layout__mobile-header">
                <button
                    className="app-layout__hamburger"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Ouvrir le menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <span className="app-layout__mobile-title">📚 Charge Scolaire</span>
            </header>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="app-layout__overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(prev => !prev)}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="app-layout__main">
                <Outlet />
            </main>

            {/* Relogin Modal for session expiration */}
            <ReloginModal
                isOpen={showReloginModal}
                onClose={closeReloginModal}
                onSuccess={closeReloginModal}
            />
        </div>
    );
}

export default AppLayout;
