
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import './TeacherLayout.css';

export function TeacherLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);

    // Silent ED reconnection - WAIT for it to complete
    const attemptEdReconnect = useCallback(async () => {
        if (!realEcoleDirecteClient.isAuthenticated()) {
            console.log('🔄 Starting ED silent reconnection...');
            try {
                const success = await realEcoleDirecteClient.silentReconnect();
                if (success) {
                    console.log('✅ ED reconnection successful!');
                }
                return success;
            } catch (e) {
                console.warn('ED silent reconnect failed:', e);
                return false;
            }
        }
        return true; // Already authenticated
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            // First check localStorage session (for ED-based login)
            const localSession = localStorage.getItem('teacher_session');
            if (localSession) {
                try {
                    const sessionData = JSON.parse(localSession);
                    if (sessionData.role === 'teacher' && sessionData.userId) {
                        // Verify user still exists in DB
                        const { data: userData } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', sessionData.userId)
                            .maybeSingle();

                        if (userData && userData.role === 'teacher') {
                            console.log('✅ Teacher authenticated via localStorage session');
                            setTeacher(userData);

                            // WAIT for ED silent reconnection to complete
                            await attemptEdReconnect();

                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Invalid localStorage session:', e);
                    localStorage.removeItem('teacher_session');
                }
            }

            // Fallback to Supabase Auth session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/teacher/login');
                return;
            }

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (userError || !userData || userData.role !== 'teacher') {
                await supabase.auth.signOut();
                navigate('/teacher/login');
                return;
            }

            setTeacher(userData);

            // WAIT for ED silent reconnection to complete
            await attemptEdReconnect();

        } catch (error) {
            console.error('Error checking auth:', error);
            navigate('/teacher/login');
        } finally {
            setLoading(false);
        }
    }, [navigate, attemptEdReconnect]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleLogout = async () => {
        // Clear ED session and stored credentials
        realEcoleDirecteClient.logout();
        realEcoleDirecteClient.clearStoredCredentials();

        await supabase.auth.signOut();
        localStorage.removeItem('teacher_session');
        navigate('/teacher/login');
    };

    if (loading) {
        return (
            <div className="teacher-dashboard teacher-dashboard--loading">
                <div className="teacher-dashboard__loader">
                    <div className="loader-spinner" />
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    const isActive = (path) => {
        if (path === '/teacher' && location.pathname === '/teacher') return true;
        if (path !== '/teacher' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="teacher-dashboard">
            {/* Sidebar */}
            <aside className="teacher-sidebar">
                <div className="teacher-sidebar__header">
                    <span className="teacher-sidebar__logo">👨‍🏫</span>
                    <span className="teacher-sidebar__title">Charge Scolaire</span>
                </div>

                <nav className="teacher-sidebar__nav">
                    <Link to="/teacher" className={`teacher-nav__item ${isActive('/teacher') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">🏠</span>
                        <span>Tableau de bord</span>
                    </Link>
                    <Link to="/teacher/classes" className={`teacher-nav__item ${isActive('/teacher/classes') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">👥</span>
                        <span>Mes classes</span>
                    </Link>
                    <Link to="/teacher/workload" className={`teacher-nav__item ${isActive('/teacher/workload') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">📊</span>
                        <span>Charge de travail</span>
                    </Link>
                    <Link to="/teacher/dst" className={`teacher-nav__item ${isActive('/teacher/dst') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">📋</span>
                        <span>DST du samedi</span>
                    </Link>
                    <Link to="/teacher/students" className={`teacher-nav__item ${isActive('/teacher/students') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">🎓</span>
                        <span>Mes élèves</span>
                    </Link>
                    <Link to="/teacher/schedule" className={`teacher-nav__item ${isActive('/teacher/schedule') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">📅</span>
                        <span>Emploi du temps</span>
                    </Link>
                    <Link to="/teacher/grades" className={`teacher-nav__item ${isActive('/teacher/grades') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">💯</span>
                        <span>Notes</span>
                    </Link>
                    <Link to="/teacher/messages" className={`teacher-nav__item ${isActive('/teacher/messages') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">📬</span>
                        <span>Messagerie</span>
                    </Link>
                    <Link to="/teacher/create" className={`teacher-nav__item ${isActive('/teacher/create') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">➕</span>
                        <span>Créer un devoir</span>
                    </Link>
                    <Link to="/teacher/stats" className={`teacher-nav__item ${isActive('/teacher/stats') ? 'teacher-nav__item--active' : ''}`}>
                        <span className="teacher-nav__icon">📈</span>
                        <span>Statistiques</span>
                    </Link>
                </nav>

                <div className="teacher-sidebar__footer">
                    <div className="teacher-sidebar__user">
                        <div className="teacher-sidebar__avatar">
                            {teacher?.name?.charAt(0) || 'P'}
                        </div>
                        <div className="teacher-sidebar__user-info">
                            <span className="teacher-sidebar__user-name">{teacher?.name || 'Professeur'}</span>
                            <span className="teacher-sidebar__user-role">Enseignant</span>
                        </div>
                    </div>
                    <button className="teacher-sidebar__logout" onClick={handleLogout}>
                        🚪 Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main content Area */}
            <main className="teacher-main">
                <Outlet context={{ teacher }} />
            </main>
        </div>
    );
}

export default TeacherLayout;
