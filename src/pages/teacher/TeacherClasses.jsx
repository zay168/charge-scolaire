
import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import './TeacherClasses.css';

export function TeacherClasses() {
    const { teacher } = useOutletContext();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [edConnected, setEdConnected] = useState(false);

    // Re-login modal state
    const [showRelogin, setShowRelogin] = useState(false);
    const [reloginUsername, setReloginUsername] = useState('');
    const [reloginPassword, setReloginPassword] = useState('');
    const [reloginLoading, setReloginLoading] = useState(false);
    const [reloginError, setReloginError] = useState(null);

    // Modal state for creating a group (Supabase only)
    const [showModal, setShowModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupSubject, setNewGroupSubject] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [creating, setCreating] = useState(false);

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
            // Fetch students first - they contain the correct group/class names
            const students = await realEcoleDirecteClient.getAllTeacherStudents();

            // Build groups/classes from student data
            const groupMap = new Map();

            for (const student of students) {
                for (const grp of (student.groups || [])) {
                    if (!groupMap.has(grp.id)) {
                        // ED types: "C" = Classe, "G" = Groupe
                        const isGroup = grp.type === 'G';

                        groupMap.set(grp.id, {
                            id: grp.id,
                            name: grp.name,
                            code: grp.code,
                            type: isGroup ? 'group' : 'class',
                            isGroup: isGroup,
                            classes: isGroup ? new Set() : null, // Only track classes for groups
                            studentCount: 0
                        });
                    }

                    const entry = groupMap.get(grp.id);

                    // For groups, track which classes students come from
                    if (entry.isGroup && student.className) {
                        entry.classes.add(student.className);
                    }

                    // Increment student count
                    entry.studentCount++;
                }
            }

            // Convert Sets to Arrays and format
            const formattedGroups = Array.from(groupMap.values()).map(g => ({
                ...g,
                classes: g.classes ? Array.from(g.classes).sort().map(cls => ({ name: cls })) : []
            })).sort((a, b) => {
                // Sort: classes first, then groups
                if (a.isGroup !== b.isGroup) return a.isGroup ? 1 : -1;
                return (a.name || '').localeCompare(b.name || '');
            });

            setGroups(formattedGroups);

            const classCount = formattedGroups.filter(g => !g.isGroup).length;
            const groupCount = formattedGroups.filter(g => g.isGroup).length;
            console.log(`✅ Loaded ${classCount} classes + ${groupCount} groups from ED`);
        } catch (error) {
            console.error('Error loading ED groups:', error);
        }
    };

    const loadData = useCallback(async () => {
        if (!teacher) return;
        setLoading(true);

        try {
            // Check if ED is authenticated
            if (isEdAuthenticated()) {
                setEdConnected(true);
                await loadEdData();
            } else {
                setEdConnected(false);
                // Fallback to Supabase
                const { data: groupsData } = await supabase
                    .from('group_members')
                    .select(`
                        group_id,
                        subject_id,
                        groups (id, name, level, type, join_code, created_at),
                        subjects (id, name, color)
                    `)
                    .eq('user_id', teacher.id)
                    .eq('role', 'teacher');

                const formattedGroups = (groupsData || []).map(item => ({
                    id: item.groups?.id,
                    name: item.groups?.name,
                    type: item.groups?.type || 'group',
                    joinCode: item.groups?.join_code,
                    subject: item.subjects?.name,
                    subjectColor: item.subjects?.color || '#3b82f6',
                    studentCount: 0,
                    classes: []
                }));

                setGroups(formattedGroups);
            }

            // Load available subjects for the dropdown (Supabase)
            const { data: subjects } = await supabase
                .from('subjects')
                .select('*')
                .order('name');
            setAvailableSubjects(subjects || []);

        } catch (error) {
            console.error('Error loading classes:', error);
        } finally {
            setLoading(false);
        }
    }, [teacher, isEdAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName || !newGroupSubject) return;

        setCreating(true);
        try {
            // 1. Create the group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName,
                    type: 'group', // It's a manual group
                    created_by: teacher.id
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // 2. Add teacher as owner of this group
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    user_id: teacher.id,
                    group_id: group.id,
                    role: 'teacher',
                    subject_id: newGroupSubject
                });

            if (memberError) throw memberError;

            // Refresh list
            await loadData();
            setShowModal(false);
            setNewGroupName('');
            setNewGroupSubject('');

        } catch (error) {
            console.error('Error creating group:', error);
            alert('Erreur lors de la création du groupe.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce groupe ? Cette action est irréversible.')) return;

        try {
            const { error } = await supabase.from('groups').delete().eq('id', groupId);
            if (error) throw error;
            // Optimistic update
            setGroups(groups.filter(c => c.id !== groupId));
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Impossible de supprimer ce groupe.');
        }
    };

    if (loading) {
        return (
            <div className="teacher-dashboard__loader">
                <div className="loader-spinner" />
                <p>Chargement des classes...</p>
            </div>
        );
    }

    return (
        <>
            <header className="teacher-header">
                <div>
                    <h1 className="teacher-header__title">Mes Classes & Groupes</h1>
                    <p className="teacher-header__subtitle">
                        {edConnected
                            ? (() => {
                                const classCount = groups.filter(g => !g.isGroup).length;
                                const groupCount = groups.filter(g => g.isGroup).length;
                                const parts = [];
                                if (classCount > 0) parts.push(`${classCount} classe${classCount > 1 ? 's' : ''}`);
                                if (groupCount > 0) parts.push(`${groupCount} groupe${groupCount > 1 ? 's' : ''}`);
                                return parts.length > 0
                                    ? `${parts.join(' et ')} synchronisé${classCount + groupCount > 1 ? 's' : ''} depuis École Directe`
                                    : 'Aucune classe trouvée';
                            })()
                            : 'Gérez vos classes et créez des groupes'}
                    </p>
                </div>
                <button
                    className="teacher-header__cta"
                    onClick={() => setShowModal(true)}
                >
                    ➕ Créer un groupe
                </button>
            </header>

            <div className="teacher-content">
                {/* ED Connection status */}
                {!edConnected && (
                    <div className="teacher-students__session-alert" style={{ marginBottom: '1.5rem' }}>
                        <span>🔐</span>
                        <div>
                            <strong>Session École Directe non active</strong>
                            <p>Reconnectez-vous pour afficher vos groupes ED</p>
                        </div>
                        <button onClick={() => setShowRelogin(true)}>
                            Se reconnecter
                        </button>
                    </div>
                )}

                <div className="teacher-classes-grid">
                    {groups.length > 0 ? (
                        groups.map((g) => (
                            <div key={g.id} className="teacher-class-card teacher-class-card--large">
                                <div
                                    className="teacher-class-card__color"
                                    style={{ background: g.subjectColor || '#3b82f6' }}
                                />
                                <div className="teacher-class-card__content">
                                    <div className="teacher-class-card__header-row">
                                        <h3 className="teacher-class-card__name">{g.name}</h3>
                                        {g.type === 'group' && !edConnected && (
                                            <button
                                                className="teacher-class-card__delete"
                                                onClick={() => handleDeleteGroup(g.id)}
                                                title="Supprimer le groupe"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>

                                    <div className="teacher-class-card__meta">
                                        {g.subject && (
                                            <span className="teacher-class-card__subject">
                                                {g.subject}
                                            </span>
                                        )}
                                        <span className="teacher-class-card__count">
                                            👤 {g.studentCount} élèves
                                        </span>
                                        <span className="teacher-class-card__type-badge">
                                            {g.isGroup ? '🏷️ Groupe' : '🏫 Classe'}
                                        </span>
                                    </div>

                                    {/* Show classes only for groups (not for individual classes) */}
                                    {g.isGroup && g.classes && g.classes.length > 0 && (
                                        <div className="teacher-class-card__code-block">
                                            <span className="teacher-class-card__code-label">Élèves de :</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                                {g.classes.map((cls, idx) => (
                                                    <span key={idx} style={{
                                                        background: '#f1f5f9',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        color: '#475569'
                                                    }}>
                                                        {cls.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {g.joinCode && (
                                        <div className="teacher-class-card__code-block">
                                            <span className="teacher-class-card__code-label">Code d'invitation :</span>
                                            <div className="teacher-class-card__code-value">
                                                {g.joinCode}
                                            </div>
                                        </div>
                                    )}

                                    <div className="teacher-class-card__actions">
                                        <Link to="/teacher/students" className="teacher-btn teacher-btn--secondary">
                                            Voir les élèves
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="teacher-empty">
                            <span>👥</span>
                            <p>Aucun groupe trouvé.</p>
                            {!edConnected ? (
                                <button
                                    className="teacher-empty__cta"
                                    onClick={() => setShowRelogin(true)}
                                >
                                    Se connecter à École Directe
                                </button>
                            ) : (
                                <small>Vérifiez votre connexion École Directe</small>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for creating group */}
            {showModal && (
                <div className="teacher-modal-overlay">
                    <div className="teacher-modal">
                        <div className="teacher-modal__header">
                            <h2>Créer un nouveau groupe</h2>
                            <button className="teacher-modal__close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="teacher-modal__form">
                            <div className="teacher-form-group">
                                <label>Nom du groupe</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Latin 2nde, Club Échecs..."
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    required
                                    className="teacher-input"
                                />
                            </div>
                            <div className="teacher-form-group">
                                <label>Matière associée</label>
                                <select
                                    value={newGroupSubject}
                                    onChange={e => setNewGroupSubject(e.target.value)}
                                    required
                                    className="teacher-select"
                                >
                                    <option value="">Sélectionner une matière...</option>
                                    {availableSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="teacher-modal__actions">
                                <button type="button" className="teacher-btn teacher-btn--ghost" onClick={() => setShowModal(false)}>
                                    Annuler
                                </button>
                                <button type="submit" className="teacher-btn teacher-btn--primary" disabled={creating}>
                                    {creating ? 'Création...' : 'Créer le groupe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                Reconnectez-vous pour afficher vos groupes depuis École Directe.
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

export default TeacherClasses;
