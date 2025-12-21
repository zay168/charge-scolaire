/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APP LAYOUT
 * Main layout wrapper with sidebar for authenticated users
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import './AppLayout.css';

export function AppLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
        <div className={`app-layout ${sidebarCollapsed ? 'app-layout--collapsed' : ''}`}>
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(prev => !prev)}
            />

            <main className="app-layout__main">
                <Outlet />
            </main>
        </div>
    );
}

export default AppLayout;
