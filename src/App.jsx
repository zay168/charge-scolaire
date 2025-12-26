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
import { GradesPage } from './pages/GradesPage';
import { SchedulePage } from './pages/SchedulePage';
import { MessagesPage } from './pages/MessagesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { StatisticsPage } from './pages/StatisticsPage';

// Teacher pages
import { TeacherLoginPage } from './pages/teacher/TeacherLogin';
import { TeacherLayout } from './pages/teacher/TeacherLayout';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClasses } from './pages/teacher/TeacherClasses';
import TeacherWorkload from './pages/teacher/TeacherWorkload';
import { TeacherStudents } from './pages/teacher/TeacherStudents';
import { TeacherSchedule } from './pages/teacher/TeacherSchedule';
import { TeacherGrades } from './pages/teacher/TeacherGrades';
import { TeacherMessages } from './pages/teacher/TeacherMessages';
import DSTManager from './pages/admin/DSTManager';
import DSTBoardEditor from './pages/admin/DSTBoardEditor';

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
            <Route path="/teacher/login" element={<TeacherLoginPage />} />

            {/* Teacher routes (separate layout) */}
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="workload" element={<TeacherWorkload />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="schedule" element={<TeacherSchedule />} />
              <Route path="grades" element={<TeacherGrades />} />
              <Route path="messages" element={<TeacherMessages />} />
              <Route path="dst" element={<DSTBoardEditor />} />
              <Route path="assignments" element={<PlaceholderPage title="📝 Mes Devoirs" />} />
              <Route path="create" element={<PlaceholderPage title="➕ Créer un devoir" />} />
              <Route path="stats" element={<PlaceholderPage title="📊 Statistiques" />} />
            </Route>

            {/* DST Board Editor (full-screen, no layout) */}
            <Route path="/dst-board" element={<DSTBoardEditor />} />

            {/* Protected student routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/grades" element={<GradesPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/calendar" element={<PlaceholderPage title="📅 Calendrier" />} />
              <Route path="/classes" element={<PlaceholderPage title="👥 Mes Classes" />} />
              <Route path="/add-assignment" element={<PlaceholderPage title="➕ Ajouter un devoir" />} />
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
