/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRADES PAGE - COMPLETE REDESIGN
 * Clean, modern, premium UI for displaying student grades
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';
import './GradesPage.css';

// Subject colors
const SUBJECT_COLORS = {
    'MATHS': '#3B82F6',
    'MATHEMATIQUES': '#3B82F6',
    'FRANCAIS': '#8B5CF6',
    'FRANÇAIS': '#8B5CF6',
    'ANGLAIS': '#EC4899',
    'ESPAGNOL': '#F59E0B',
    'ALLEMAND': '#F97316',
    'HISTOIRE': '#10B981',
    'GEOGRAPHIE': '#10B981',
    'SVT': '#22C55E',
    'SCIENCES': '#22C55E',
    'PHYSIQUE': '#06B6D4',
    'CHIMIE': '#06B6D4',
    'EPS': '#EF4444',
    'TECHNOLOGIE': '#6366F1',
    'ARTS': '#F472B6',
    'MUSIQUE': '#A855F7',
    'PHILOSOPHIE': '#78716C',
    'SES': '#84CC16',
    'NSI': '#14B8A6',
    'SNT': '#14B8A6',
    'ITALIEN': '#059669',
    'ARABE': '#D97706',
    'LATIN': '#7C3AED',
    'HUMANITES': '#6366F1',
    'SECTION': '#0EA5E9',
    'default': '#6B7280',
};

const getSubjectColor = (subject) => {
    if (!subject) return SUBJECT_COLORS.default;
    const upper = subject.toUpperCase();
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
        if (upper.includes(key)) return color;
    }
    return SUBJECT_COLORS.default;
};

const getGradeColor = (value, max = 20) => {
    if (value === null) return 'var(--text-secondary)';
    const percent = (value / max) * 100;
    if (percent >= 70) return '#10B981';
    if (percent >= 50) return '#F59E0B';
    return '#EF4444';
};

const parseGradeValue = (value) => {
    if (!value) return null;
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? null : num;
};

export function GradesPage() {
    const [grades, setGrades] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [expandedSubject, setExpandedSubject] = useState(null);

    useEffect(() => {
        async function fetchGrades() {
            try {
                setIsLoading(true);
                const data = await ecoleDirecteClient.getGrades();
                setGrades(data);

                if (data?.periodes?.length > 0) {
                    const now = new Date();
                    const current = data.periodes.find(p => {
                        const start = new Date(p.dateDebut);
                        const end = new Date(p.dateFin);
                        return now >= start && now <= end;
                    }) || data.periodes[0];
                    setSelectedPeriod(current.codePeriode);
                }
            } catch (err) {
                console.error('Failed to fetch grades:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGrades();
    }, []);

    const periodData = useMemo(() => {
        if (!grades || !selectedPeriod) return null;
        return grades.periodes?.find(p => p.codePeriode === selectedPeriod);
    }, [grades, selectedPeriod]);

    const periodGrades = useMemo(() => {
        if (!grades?.notes || !selectedPeriod) return [];
        return grades.notes.filter(n => n.codePeriode === selectedPeriod);
    }, [grades, selectedPeriod]);

    const subjectsData = useMemo(() => {
        const grouped = {};

        periodGrades.forEach(grade => {
            const subject = grade.libelleMatiere || 'Autre';
            const code = grade.codeMatiere || subject;

            if (!grouped[code]) {
                grouped[code] = {
                    name: subject,
                    code,
                    color: getSubjectColor(subject),
                    grades: [],
                    totalPoints: 0,
                    totalCoef: 0,
                };
            }

            const value = parseGradeValue(grade.valeur);
            const scale = parseFloat(grade.noteSur) || 20;
            const coef = parseFloat(grade.coef) || 1;

            grouped[code].grades.push({
                id: grade.id,
                value: grade.valeur,
                numValue: value,
                scale,
                coef,
                name: grade.devoir,
                date: grade.date,
                classAverage: parseGradeValue(grade.moyenneClasse),
            });

            if (value !== null) {
                const normalized = (value / scale) * 20;
                grouped[code].totalPoints += normalized * coef;
                grouped[code].totalCoef += coef;
            }
        });

        return Object.values(grouped)
            .map(s => ({
                ...s,
                average: s.totalCoef > 0 ? Math.round((s.totalPoints / s.totalCoef) * 100) / 100 : null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [periodGrades]);

    const generalAverage = parseGradeValue(periodData?.ensembleMatieres?.moyenneGenerale);
    const classAverage = parseGradeValue(periodData?.ensembleMatieres?.moyenneClasse);

    const recentGrades = useMemo(() => {
        return [...periodGrades]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);
    }, [periodGrades]);

    if (isLoading) {
        return (
            <div className="gp">
                <div className="gp-loading">
                    <div className="gp-spinner" />
                    <p>Chargement des notes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="gp">
                <div className="gp-error">
                    <span>❌</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="gp">
            {/* Header */}
            <header className="gp-header">
                <h1 className="gp-title">Mes Notes</h1>
                {grades?.periodes && (
                    <div className="gp-periods">
                        {grades.periodes.map(p => (
                            <button
                                key={p.codePeriode}
                                className={`gp-period-btn ${selectedPeriod === p.codePeriode ? 'active' : ''}`}
                                onClick={() => setSelectedPeriod(p.codePeriode)}
                            >
                                {p.periode}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* Stats */}
            <section className="gp-stats">
                <div className="gp-stat gp-stat--main">
                    <div className="gp-stat-icon">📊</div>
                    <div className="gp-stat-content">
                        <span className="gp-stat-label">Moyenne générale</span>
                        <span
                            className="gp-stat-value"
                            style={{ color: generalAverage ? getGradeColor(generalAverage) : undefined }}
                        >
                            {generalAverage?.toFixed(2) || '--'}
                            <small>/20</small>
                        </span>
                    </div>
                    {generalAverage && (
                        <div className="gp-stat-bar">
                            <div
                                className="gp-stat-bar-fill"
                                style={{
                                    width: `${(generalAverage / 20) * 100}%`,
                                    background: getGradeColor(generalAverage)
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="gp-stat">
                    <div className="gp-stat-icon">👥</div>
                    <div className="gp-stat-content">
                        <span className="gp-stat-label">Classe</span>
                        <span className="gp-stat-value">{classAverage?.toFixed(2) || '--'}<small>/20</small></span>
                    </div>
                </div>

                <div className="gp-stat">
                    <div className="gp-stat-icon">📝</div>
                    <div className="gp-stat-content">
                        <span className="gp-stat-label">Notes</span>
                        <span className="gp-stat-value">{periodGrades.length}</span>
                    </div>
                </div>

                <div className="gp-stat">
                    <div className="gp-stat-icon">📚</div>
                    <div className="gp-stat-content">
                        <span className="gp-stat-label">Matières</span>
                        <span className="gp-stat-value">{subjectsData.length}</span>
                    </div>
                </div>
            </section>

            {/* Recent grades */}
            {recentGrades.length > 0 && (
                <section className="gp-section">
                    <h2 className="gp-section-title">Notes récentes</h2>
                    <div className="gp-recent">
                        {recentGrades.map(grade => {
                            const numValue = parseGradeValue(grade.valeur);
                            const scale = parseFloat(grade.noteSur) || 20;
                            const color = getSubjectColor(grade.libelleMatiere);
                            return (
                                <div key={grade.id} className="gp-recent-card" style={{ '--accent': color }}>
                                    <div className="gp-recent-grade" style={{ color: numValue ? getGradeColor(numValue, scale) : undefined }}>
                                        {grade.valeur}<span>/{scale}</span>
                                    </div>
                                    <div className="gp-recent-info">
                                        <span className="gp-recent-subject">{grade.libelleMatiere}</span>
                                        <span className="gp-recent-name">{grade.devoir}</span>
                                    </div>
                                    <span className="gp-recent-date">
                                        {new Date(grade.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Subjects */}
            <section className="gp-section">
                <h2 className="gp-section-title">Par matière</h2>
                <div className="gp-subjects">
                    {subjectsData.length > 0 ? (
                        subjectsData.map(subject => (
                            <article
                                key={subject.code}
                                className={`gp-subject ${expandedSubject === subject.code ? 'expanded' : ''}`}
                                style={{ '--accent': subject.color }}
                            >
                                <div
                                    className="gp-subject-header"
                                    onClick={() => setExpandedSubject(expandedSubject === subject.code ? null : subject.code)}
                                >
                                    <div className="gp-subject-color" style={{ background: subject.color }} />
                                    <div className="gp-subject-info">
                                        <h3>{subject.name}</h3>
                                        <span>{subject.grades.length} note{subject.grades.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="gp-subject-avg" style={{ color: subject.average ? getGradeColor(subject.average) : undefined }}>
                                        {subject.average !== null ? (
                                            <>{subject.average.toFixed(2)}<small>/20</small></>
                                        ) : '--'}
                                    </div>
                                    <div className="gp-subject-toggle">
                                        {expandedSubject === subject.code ? '−' : '+'}
                                    </div>
                                </div>

                                {subject.average !== null && (
                                    <div className="gp-subject-bar">
                                        <div
                                            className="gp-subject-bar-fill"
                                            style={{
                                                width: `${(subject.average / 20) * 100}%`,
                                                background: subject.color
                                            }}
                                        />
                                    </div>
                                )}

                                {expandedSubject === subject.code && (
                                    <div className="gp-subject-grades">
                                        {subject.grades.map(grade => (
                                            <div key={grade.id} className="gp-grade-row">
                                                <div className="gp-grade-value" style={{ color: grade.numValue !== null ? getGradeColor(grade.numValue, grade.scale) : undefined }}>
                                                    {grade.value}<span>/{grade.scale}</span>
                                                </div>
                                                <div className="gp-grade-details">
                                                    <span className="gp-grade-name">{grade.name}</span>
                                                    <span className="gp-grade-meta">
                                                        {new Date(grade.date).toLocaleDateString('fr-FR')} • coef {grade.coef}
                                                    </span>
                                                </div>
                                                {grade.classAverage && (
                                                    <div className="gp-grade-class">
                                                        Classe: {grade.classAverage}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))
                    ) : (
                        <div className="gp-empty">
                            <span>📚</span>
                            <p>Aucune note pour cette période</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default GradesPage;
