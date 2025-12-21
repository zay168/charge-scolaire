/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MAIN APPLICATION ENTRY
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkloadProvider } from './contexts/WorkloadContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Import global styles
import './styles/design-system.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkloadProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<PlaceholderPage title="📅 Calendrier" />} />
              <Route path="/assignments" element={<PlaceholderPage title="📝 Devoirs" />} />
              <Route path="/classes" element={<PlaceholderPage title="👥 Mes Classes" />} />
              <Route path="/add-assignment" element={<PlaceholderPage title="➕ Ajouter un devoir" />} />
              <Route path="/statistics" element={<PlaceholderPage title="📊 Statistiques" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WorkloadProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

/**
 * Placeholder component for routes not yet implemented
 */
function PlaceholderPage({ title }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 'var(--space-4)',
      color: 'var(--color-neutral-500)',
    }}>
      <span style={{ fontSize: '4rem' }}>🚧</span>
      <h1 style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--font-semibold)',
        color: 'var(--color-neutral-700)',
        margin: 0,
      }}>
        {title}
      </h1>
      <p style={{ margin: 0 }}>Cette page est en cours de développement</p>
    </div>
  );
}

export default App;
