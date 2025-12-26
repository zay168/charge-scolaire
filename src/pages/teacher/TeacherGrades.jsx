
import React, { useState, useEffect } from 'react';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import { useOutletContext } from 'react-router-dom';
import './TeacherDashboard.css';

export function TeacherGrades() {
    // const { teacher } = useOutletContext(); // Unused
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [periods] = useState([
        { id: 'A001', name: '1er Trimestre' },
        { id: 'A002', name: '2ème Trimestre' },
        { id: 'A003', name: '3ème Trimestre' }
    ]);
    const [selectedPeriod, setSelectedPeriod] = useState('A001');
    const [subjectCode, setSubjectCode] = useState('ARA3'); // Default, editable

    const [gradesData, setGradesData] = useState(null); // { devoirs: [], eleves: [] }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadClasses();
    }, []);

    // Load Grades when class or period changes
    useEffect(() => {
        if (selectedClass) {
            fetchGrades();
        }
    }, [selectedClass, selectedPeriod]);

    const loadClasses = async () => {
        try {
            const students = await realEcoleDirecteClient.getAllTeacherStudents();
            // Consolidate groups from students
            const groupMap = new Map();
            for (const student of students) {
                for (const grp of (student.groups || [])) {
                    if (!groupMap.has(grp.id)) {
                        groupMap.set(grp.id, {
                            id: grp.id,
                            name: grp.name,
                            type: grp.type,
                            code: grp.code
                        });
                    }
                }
            }
            const groups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setClasses(groups);
            if (groups.length > 0) setSelectedClass(groups[0]);
        } catch (err) {
            console.error(err);
            setError("Impossible de charger les classes.");
        }
    };

    const fetchGrades = async () => {
        if (!selectedClass) return;
        setLoading(true);
        setError(null);
        try {
            // Use the new API method
            const data = await realEcoleDirecteClient.getTeacherGrades(selectedClass.id, selectedPeriod, subjectCode);
            setGradesData(data);
        } catch (err) {
            console.error(err);
            setGradesData(null);
            setError("Erreur lors du chargement des notes. Vérifiez le code matière.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate averages per assignment
    const getAssignmentAverage = (assignmentId) => {
        if (!gradesData || !gradesData.eleves) return '-';
        let sum = 0;
        let count = 0;
        gradesData.eleves.forEach(el => {
            const gradeInfo = el.devoirs[assignmentId];
            if (gradeInfo && !isNaN(parseFloat(gradeInfo.note))) {
                // Handle comma decimal separator if present and convert to float
                sum += parseFloat(gradeInfo.note.replace(',', '.'));
                count++;
            }
        });
        return count > 0 ? (sum / count).toFixed(2) : '-';
    };

    // Calculate student average
    const getStudentAverage = (studentDevoirs) => {
        if (!studentDevoirs) return '-';
        let sum = 0;
        let weightSum = 0;
        Object.values(studentDevoirs).forEach(d => {
            if (d.note && !isNaN(parseFloat(d.note.replace(',', '.'))) && !d.nonSignificatif) {
                const val = parseFloat(d.note.replace(',', '.'));
                const coef = parseFloat(d.coef) || 1;
                sum += val * coef;
                weightSum += coef;
            }
        });
        return weightSum > 0 ? (sum / weightSum).toFixed(2) : '-';
    };

    return (
        <div className="teacher-class-details">
            <header className="teacher-header">
                <div>
                    <h1 className="teacher-header__title">📝 Notes & Évaluations</h1>
                    <p className="teacher-header__subtitle">Carnet de notes de vos classes</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="input-group">
                        <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Matière:</label>
                        <input
                            type="text"
                            value={subjectCode}
                            onChange={(e) => setSubjectCode(e.target.value)}
                            onBlur={() => fetchGrades()} // Refresh on blur
                            style={{
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                width: '80px',
                                textAlign: 'center'
                            }}
                        />
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
                {/* Sidebar: Selectors */}
                <div className="teacher-card">
                    <h3 style={{ marginBottom: '1rem' }}>Filtres</h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="teacher-label">Période</label>
                        <select
                            className="teacher-select"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="teacher-label">Classe / Groupe</label>
                        <div className="teacher-classes-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {classes.map(c => (
                                <button
                                    key={c.id}
                                    className={`teacher-btn ${selectedClass?.id === c.id ? 'teacher-btn--primary' : 'teacher-btn--secondary'}`}
                                    onClick={() => setSelectedClass(c)}
                                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}
                                >
                                    <span style={{ marginRight: '0.5rem' }}>👥</span>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main: Grades Table */}
                <div className="teacher-card" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Chargement des notes...</div>
                    ) : error ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
                    ) : gradesData ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', minWidth: '200px' }}>Élève</th>
                                    <th style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', fontWeight: 'bold' }}>Moyenne</th>
                                    {gradesData.devoirs.map(evalItem => (
                                        <th key={evalItem.id} style={{ textAlign: 'center', padding: '1rem', minWidth: '100px', fontSize: '0.9rem' }}>
                                            <div style={{ fontWeight: '600' }}>{evalItem.libelle}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                                {new Date(evalItem.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                Coeff. {evalItem.coef}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gradesData.eleves.map(studentItem => (
                                    <tr key={studentItem.eleve.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '500' }}>{studentItem.eleve.nom} {studentItem.eleve.prenom}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', fontWeight: 'bold', color: '#3b82f6' }}>
                                            {getStudentAverage(studentItem.devoirs)}
                                        </td>
                                        {gradesData.devoirs.map(evalItem => {
                                            const grade = studentItem.devoirs[evalItem.id];
                                            return (
                                                <td key={evalItem.id} style={{ textAlign: 'center', padding: '1rem' }}>
                                                    {grade ? (
                                                        <div style={{
                                                            display: 'inline-block',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            background: grade.nonSignificatif ? '#e2e8f0' : '#dcfce7',
                                                            color: grade.nonSignificatif ? '#94a3b8' : '#166534',
                                                            fontWeight: '600'
                                                        }}>
                                                            {grade.note}
                                                            {grade.nonSignificatif && <span style={{ fontSize: '0.7em', marginLeft: '2px' }}>(Abs)</span>}
                                                        </div>
                                                    ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {/* Averages Row */}
                                <tr style={{ background: '#f1f5f9', fontWeight: '600' }}>
                                    <td style={{ padding: '1rem' }}>Moyenne Classe</td>
                                    <td style={{ textAlign: 'center', padding: '1rem' }}>-</td>
                                    {gradesData.devoirs.map(evalItem => (
                                        <td key={evalItem.id} style={{ textAlign: 'center', padding: '1rem' }}>
                                            {getAssignmentAverage(evalItem.id)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', fontStyle: 'italic', color: '#64748b' }}>
                            Sélectionnez une classe pour voir les notes.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
