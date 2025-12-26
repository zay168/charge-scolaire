/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SIDEBAR COMPONENT
 * Main navigation sidebar for the application
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const STUDENT_LINKS = [
    { to: '/', icon: '🏠', label: 'Tableau de bord' },
    { to: '/grades', icon: '📊', label: 'Notes' },
    { to: '/schedule', icon: '📅', label: 'Emploi du temps' },
    { to: '/messages', icon: '📨', label: 'Messagerie' },
    { to: '/assignments', icon: '📝', label: 'Devoirs' },
    { to: '/statistics', icon: '📈', label: 'Statistiques' },
];

const TEACHER_LINKS = [
    { to: '/', icon: '🏠', label: 'Tableau de bord' },
    { to: '/classes', icon: '👥', label: 'Mes classes' },
    { to: '/add-assignment', icon: '➕', label: 'Ajouter un devoir' },
    { to: '/calendar', icon: '📅', label: 'Calendrier DST' },
    { to: '/statistics', icon: '📊', label: 'Statistiques' },
];

export function Sidebar({ collapsed = false, onToggle, isOpen = false, onClose }) {
    const { user, userType, logout } = useAuth();

    const links = userType === 'teacher' ? TEACHER_LINKS : STUDENT_LINKS;

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${isOpen ? 'sidebar--open' : ''}`}>
            {/* Close button for mobile */}
            <button
                className="sidebar__close-btn"
                onClick={onClose}
                aria-label="Fermer le menu"
            >
                ✕
            </button>
            <div className="sidebar__brand">
                <div className="sidebar__logo">
                    <span className="sidebar__logo-icon">📚</span>
                    {!collapsed && <span className="sidebar__logo-text">Charge Scolaire</span>}
                </div>
                <button
                    className="sidebar__toggle btn btn--ghost btn--icon"
                    onClick={onToggle}
                    aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
                >
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* User info */}
            <div className="sidebar__user">
                <div className="sidebar__avatar">
                    {user?.firstName?.[0] || '?'}{user?.lastName?.[0] || ''}
                </div>
                {!collapsed && (
                    <div className="sidebar__user-info">
                        <span className="sidebar__user-name">
                            {user?.firstName} {user?.lastName}
                        </span>
                        <span className="sidebar__user-role">
                            {userType === 'teacher' ? 'Professeur' : 'Élève'}
                            {user?.classe && ` • ${user.classe}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar__nav">
                <ul className="sidebar__links">
                    {links.map(link => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                end={link.to === '/'}
                            >
                                <span className="sidebar__link-icon">{link.icon}</span>
                                {!collapsed && (
                                    <span className="sidebar__link-label">{link.label}</span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer / Logout */}
            <div className="sidebar__footer">
                <a
                    href="https://www.ecoledirecte.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sidebar__ed-link"
                    title="Aller sur École Directe"
                >
                    <span className="sidebar__link-icon">🔗</span>
                    {!collapsed && <span>École Directe</span>}
                </a>
                <button
                    className="sidebar__logout"
                    onClick={logout}
                >
                    <span className="sidebar__link-icon">🚪</span>
                    {!collapsed && <span>Déconnexion</span>}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
