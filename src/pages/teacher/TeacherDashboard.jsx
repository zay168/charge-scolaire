import { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import './TeacherDashboard.css';

export function TeacherDashboard() {
    const { teacher } = useOutletContext();
    const [classes, setClasses] = useState([]);
    const [recentAssignments, setRecentAssignments] = useState([]);
    const [nextClasses, setNextClasses] = useState([]); // State for upcoming classes from ED
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalStudents: 0,
        totalGroups: 0,
        pendingAssignments: 0
    });
    const [loading, setLoading] = useState(true);
    const [edConnected, setEdConnected] = useState(false);

    // Re-login modal state
    const [showRelogin, setShowRelogin] = useState(false);
    const [reloginUsername, setReloginUsername] = useState('');
    const [reloginPassword, setReloginPassword] = useState('');
    const [reloginLoading, setReloginLoading] = useState(false);
    const [reloginError, setReloginError] = useState(null);

    const isEdAuthenticated = useCallback(() => {
        return realEcoleDirecteClient.isAuthenticated() &&
            realEcoleDirecteClient.account?.type === 'P';
    }, []);

    const handleRelogin = async (e) => {
        e.preventDefault();
        setReloginLoading(true);
        setReloginError(null);

        try {
            await realEcoleDirecteClient.login(reloginUsername, reloginPassword);

            if (realEcoleDirecteClient.account?.type !== 'P') {
                throw new Error('Ce compte n\'est pas un compte professeur');
            }

            setShowRelogin(false);
            setReloginUsername('');
            setReloginPassword('');
            setEdConnected(true);
            loadEdData();
        } catch (err) {
            setReloginError(err.message);
        } finally {
            setReloginLoading(false);
        }
    };

    const loadEdData = async () => {
        try {
            // Fetch students from ED - they contain correct group info
            const fetchedStudents = await realEcoleDirecteClient.getAllTeacherStudents();

            // Build groups from student data
            const groupMap = new Map();
            const classSet = new Set();

            for (const student of fetchedStudents) {
                // Track unique classes
                if (student.className) {
                    classSet.add(student.className);
                }

                // Track groups
                for (const grp of (student.groups || [])) {
                    if (!groupMap.has(grp.id)) {
                        groupMap.set(grp.id, {
                            id: grp.id,
                            name: grp.name,
                            type: grp.type
                        });
                    }
                }
            }

            const groups = Array.from(groupMap.values());

            // Set classes for display (unique group names, not class names)
            setClasses(groups.map(g => ({
                id: g.id,
                name: g.name,
                code: g.code
            })));


            // Update stats
            setStats({
                totalClasses: classSet.size, // Unique class names
                totalStudents: fetchedStudents.length,
                totalGroups: groups.length,
                pendingAssignments: 0
            });

            // Fetch Schedule
            const todayDate = new Date();
            const today = todayDate.toISOString().split('T')[0];
            // Look ahead 45 days to find classes even during holidays
            const nextMonth = new Date(todayDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            let upcoming = [];

            try {
                const schedule = await realEcoleDirecteClient.getTeacherTextbookSlots(today, nextMonth);
                console.log('📅 Schedule fetched:', schedule.length, 'events');

                // Filter upcoming classes (e.g. not cancelled, in future)
                const now = new Date();
                upcoming = schedule
                    .filter(evt => new Date(evt.end) > now && !evt.isCancelled)
                    .sort((a, b) => new Date(a.start) - new Date(b.start))
                    .slice(0, 5);

                setNextClasses(upcoming);
            } catch (err) {
                console.warn('Could not fetch schedule:', err);
            }

            // Count actual pending assignments in the upcoming week
            const pendingCount = upcoming.filter(c => c.hasHomework).length;

            // Update stats
            setStats({
                totalClasses: classSet.size, // Unique class names
                totalStudents: fetchedStudents.length,
                totalGroups: groups.length,
                pendingAssignments: pendingCount // Real homework count!
            });

            console.log(`✅ Dashboard: ${classSet.size} classes, ${groups.length} groups, ${fetchedStudents.length} students`);
        } catch (error) {
            console.error('Error loading ED data:', error);
        }
    };

    const loadData = useCallback(async () => {
        if (!teacher) return;

        try {
            // Check if ED is authenticated
            if (isEdAuthenticated()) {
                setEdConnected(true);
                await loadEdData();
            } else {
                setEdConnected(false);
                // Try loading from Supabase as fallback
                const { data: groupsData } = await supabase
                    .from('group_members')
                    .select(`
                        group_id,
                        subject_id,
                        groups (id, name, level, type, join_code),
                        subjects (id, name, color)
                    `)
                    .eq('user_id', teacher.id)
                    .eq('role', 'teacher');

                setClasses((groupsData || []).map(g => ({
                    id: g.groups?.id,
                    name: g.groups?.name,
                    subject: g.subjects?.name,
                    subjectColor: g.subjects?.color
                })));
            }

            // Load recent assignments from Supabase
            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('*')
                .eq('created_by', teacher.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentAssignments(assignmentsData || []);

            // Count pending assignments
            const { count: pendingCount } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', teacher.id)
                .gte('due_date', new Date().toISOString().split('T')[0]);

            setStats(prev => ({
                ...prev,
                pendingAssignments: pendingCount || 0
            }));

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [teacher, isEdAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="teacher-dashboard__loader">
                <div className="loader-spinner" />
                <p>Chargement des données...</p>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <header className="teacher-header">
                <div>
                    <h1 className="teacher-header__title">
                        Bonjour, {teacher?.name?.split(' ')[0] || 'Professeur'} 👋
                    </h1>
                    <p className="teacher-header__subtitle">
                        Voici un aperçu de vos classes et devoirs
                    </p>
                </div>
                <Link to="/teacher/create" className="teacher-header__cta">
                    ➕ Nouveau devoir
                </Link>
            </header>

            {/* Stats cards */}
            <div className="teacher-stats">
                <div className="teacher-stat-card">
                    <div className="teacher-stat-card__icon">👥</div>
                    <div className="teacher-stat-card__content">
                        <span className="teacher-stat-card__value">{stats.totalClasses}</span>
                        <span className="teacher-stat-card__label">Classes</span>
                    </div>
                </div>
                <div className="teacher-stat-card">
                    <div className="teacher-stat-card__icon">🎓</div>
                    <div className="teacher-stat-card__content">
                        <span className="teacher-stat-card__value">{stats.totalStudents}</span>
                        <span className="teacher-stat-card__label">Élèves</span>
                    </div>
                </div>
                <div className="teacher-stat-card">
                    <div className="teacher-stat-card__icon">📝</div>
                    <div className="teacher-stat-card__content">
                        <span className="teacher-stat-card__value">{stats.pendingAssignments}</span>
                        <span className="teacher-stat-card__label">Devoirs à venir</span>
                    </div>
                </div>
                <div className="teacher-stat-card teacher-stat-card--accent">
                    <div className="teacher-stat-card__icon">🏷️</div>
                    <div className="teacher-stat-card__content">
                        <span className="teacher-stat-card__value">{stats.totalGroups}</span>
                        <span className="teacher-stat-card__label">Groupes</span>
                    </div>
                </div>
            </div>

            {/* ED Connection status */}
            {!edConnected && (
                <div className="teacher-students__session-alert" style={{ marginBottom: '1.5rem' }}>
                    <span>🔐</span>
                    <div>
                        <strong>Session École Directe non active</strong>
                        <p>Reconnectez-vous pour synchroniser vos données</p>
                    </div>
                    <button onClick={() => setShowRelogin(true)}>
                        Se reconnecter
                    </button>
                </div>
            )}

            {/* Content grid */}
            <div className="teacher-content">
                {/* Classes section */}
                <section className="teacher-section">
                    <div className="teacher-section__header">
                        <h2 className="teacher-section__title">👥 Mes classes</h2>
                        <Link to="/teacher/classes" className="teacher-section__link">
                            Voir tout →
                        </Link>
                    </div>
                    <div className="teacher-classes">
                        {classes.length > 0 ? (
                            classes.slice(0, 6).map((c, idx) => (
                                <div key={c.id || idx} className="teacher-class-card">
                                    <div
                                        className="teacher-class-card__color"
                                        style={{ background: c.subjectColor || '#3b82f6' }}
                                    />
                                    <div className="teacher-class-card__content">
                                        <h3 className="teacher-class-card__name">
                                            {c.name || c.code || 'Classe'}
                                        </h3>
                                        <div className="teacher-class-card__meta">
                                            {c.code && (
                                                <span className="teacher-class-card__code">
                                                    {c.code}
                                                </span>
                                            )}
                                            {c.subject && (
                                                <span className="teacher-class-card__subject">
                                                    {c.subject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="teacher-empty">
                                <span>📭</span>
                                <p>Aucune classe assignée</p>
                                <small>Connectez-vous à École Directe pour voir vos classes</small>
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent assignments */}
                {/* Recent assignments / Next Classes */}
                <section className="teacher-section">
                    <div className="teacher-section__header">
                        <h2 className="teacher-section__title">
                            {edConnected ? '📅 Prochains cours' : '📝 Devoirs récents'}
                        </h2>
                        {edConnected ? (
                            <span className="teacher-section__link" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                                Emploi du temps complet (bientôt)
                            </span>
                        ) : (
                            <Link to="/teacher/assignments" className="teacher-section__link">
                                Voir tout →
                            </Link>
                        )}
                    </div>
                    <div className="teacher-assignments">
                        {edConnected ? (
                            nextClasses.length > 0 ? (
                                nextClasses.map(c => (
                                    <div key={c.id} className="teacher-assignment-item">
                                        <div
                                            className="teacher-assignment-item__type"
                                            style={{ backgroundColor: c.hasHomework ? '#f59e0b' : (c.color || '#3b82f6'), color: 'white' }}
                                            title={c.hasHomework ? "Devoir prévu" : "Cours normal"}
                                        >
                                            {c.hasHomework ? '⚠️' : '📅'}
                                        </div>
                                        <div className="teacher-assignment-item__content">
                                            <span className="teacher-assignment-item__title">
                                                {c.subject || c.text || 'Cours'}
                                            </span>
                                            <span className="teacher-assignment-item__date">
                                                {new Date(c.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} •
                                                {new Date(c.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {(c.room || c.roomId) && (
                                                <small style={{ color: '#64748b', display: 'block' }}>
                                                    Salle {c.room || c.roomId}
                                                </small>
                                            )}
                                            {c.hasHomework && (
                                                <small style={{ color: '#d97706', display: 'block', fontWeight: '500', marginTop: '2px' }}>
                                                    📝 Devoir à faire/vérifier
                                                </small>
                                            )}
                                        </div>
                                        <span className="teacher-assignment-item__badge" style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}>
                                            {c.className}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="teacher-empty">
                                    <span>📅</span>
                                    <p>Aucun cours prévu prochainement</p>
                                </div>
                            )
                        ) : (
                            recentAssignments.length > 0 ? (
                                recentAssignments.map(a => (
                                    <div key={a.id} className="teacher-assignment-item">
                                        <div className={`teacher-assignment-item__type teacher-assignment-item__type--${a.type}`}>
                                            {a.type === 'test' ? '📋' : '📝'}
                                        </div>
                                        <div className="teacher-assignment-item__content">
                                            <span className="teacher-assignment-item__title">
                                                {a.title || a.subject_name || 'Devoir'}
                                            </span>
                                            <span className="teacher-assignment-item__date">
                                                Pour le {new Date(a.due_date).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'long'
                                                })}
                                            </span>
                                        </div>
                                        <span className={`teacher-assignment-item__badge teacher-assignment-item__badge--${a.type}`}>
                                            {a.type === 'test' ? 'Évaluation' : 'Devoir'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="teacher-empty">
                                    <span>📭</span>
                                    <p>Aucun devoir créé</p>
                                    <Link to="/teacher/create" className="teacher-empty__cta">
                                        Créer mon premier devoir
                                    </Link>
                                </div>
                            )
                        )}
                    </div>
                </section>
            </div>

            {/* Quick actions */}
            <div className="teacher-actions">
                <h2 className="teacher-actions__title">Actions rapides</h2>
                <div className="teacher-actions__grid">
                    <Link to="/teacher/create" className="teacher-action-card">
                        <span className="teacher-action-card__icon">📝</span>
                        <span className="teacher-action-card__label">Créer un devoir</span>
                    </Link>
                    <Link to="/teacher/create?type=test" className="teacher-action-card">
                        <span className="teacher-action-card__icon">📋</span>
                        <span className="teacher-action-card__label">Programmer un DST</span>
                    </Link>
                    <Link to="/teacher/classes" className="teacher-action-card">
                        <span className="teacher-action-card__icon">➕</span>
                        <span className="teacher-action-card__label">Ajouter une classe</span>
                    </Link>
                    <Link to="/teacher/stats" className="teacher-action-card">
                        <span className="teacher-action-card__icon">📊</span>
                        <span className="teacher-action-card__label">Voir les stats</span>
                    </Link>
                </div>
            </div>

            {/* Re-login Modal */}
            {showRelogin && (
                <div className="teacher-modal-overlay">
                    <div className="teacher-modal">
                        <div className="teacher-modal__header">
                            <h2>🔐 Reconnexion École Directe</h2>
                            <button
                                className="teacher-modal__close"
                                onClick={() => setShowRelogin(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleRelogin} className="teacher-modal__form">
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                                Reconnectez-vous pour synchroniser vos données depuis École Directe.
                            </p>

                            {reloginError && (
                                <div className="teacher-students__error" style={{ marginBottom: '1rem' }}>
                                    <span>⚠️</span>
                                    <p>{reloginError}</p>
                                </div>
                            )}

                            <div className="teacher-form-group">
                                <label>Identifiant ED</label>
                                <input
                                    type="text"
                                    placeholder="Votre identifiant..."
                                    value={reloginUsername}
                                    onChange={(e) => setReloginUsername(e.target.value)}
                                    required
                                    className="teacher-input"
                                />
                            </div>
                            <div className="teacher-form-group">
                                <label>Mot de passe</label>
                                <input
                                    type="password"
                                    placeholder="Votre mot de passe..."
                                    value={reloginPassword}
                                    onChange={(e) => setReloginPassword(e.target.value)}
                                    required
                                    className="teacher-input"
                                />
                            </div>
                            <div className="teacher-modal__actions">
                                <button
                                    type="button"
                                    className="teacher-btn teacher-btn--ghost"
                                    onClick={() => setShowRelogin(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="teacher-btn teacher-btn--primary"
                                    disabled={reloginLoading}
                                >
                                    {reloginLoading ? 'Connexion...' : 'Se connecter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default TeacherDashboard;
