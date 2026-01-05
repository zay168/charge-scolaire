/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRADES PAGE - COMPLETE REDESIGN (NEON DARK)
 * Clean, modern, premium UI for displaying student grades
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';
import './GradesPage.css';

// Premium Neon Subject Colors
const SUBJECT_COLORS = {
    'MATHS': '#2997FF', // Blue
    'MATHEMATIQUES': '#2997FF',
    'FRANCAIS': '#BF5AF2', // Purple
    'FRANÇAIS': '#BF5AF2',
    'ANGLAIS': '#FF375F', // Pink
    'ESPAGNOL': '#FFD60A', // Yellow/Gold
    'ALLEMAND': '#FF9F0A', // Orange
    'HISTOIRE': '#32D74B', // Green
    'GEOGRAPHIE': '#32D74B',
    'SVT': '#30D158', // Green
    'SCIENCES': '#30D158',
    'PHYSIQUE': '#64D2FF', // Cyan
    'CHIMIE': '#64D2FF',
    'EPS': '#FF453A', // Red
    'TECHNOLOGIE': '#5E5CE6', // Indigo
    'ARTS': '#FF2D55', // Pink Red
    'MUSIQUE': '#AC8E68', // Brown/Gold
    'PHILOSOPHIE': '#98989D', // Gray
    'SES': '#30D158',
    'NSI': '#64D2FF',
    'SNT': '#64D2FF',
    'ITALIEN': '#32D74B',
    'ARABE': '#FFD60A',
    'LATIN': '#BF5AF2',
    'HUMANITES': '#5E5CE6',
    'SECTION': '#0A84FF',
    'default': '#8E8E93',
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
    if (value === null) return 'rgba(255, 255, 255, 0.4)';
    const percent = (value / max) * 100;
    if (percent >= 75) return '#32D74B'; // Green
    if (percent >= 50) return '#FFD60A'; // Deep Yellow
    return '#FF453A'; // Red
};

const parseGradeValue = (value) => {
    if (!value) return null;
    // Handle "14,5" -> 14.5
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
                    // Try to find current period, otherwise take the last one (often the most relevant)
                    // or the first one if logic fails.
                    let current = data.periodes.find(p => {
                        const start = new Date(p.dateDebut);
                        const end = new Date(p.dateFin);
                        return now >= start && now <= end;
                    });

                    // If no current period found (e.g. summer), default to the last one (Trimestre 3)
                    if (!current) {
                        current = data.periodes[data.periodes.length - 1];
                    }

                    if (current) setSelectedPeriod(current.codePeriode);
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
            // Coef usually string "1" or "0.5" or sometimes missing
            const coefStr = String(grade.coef || '1').replace(',', '.');
            const coef = parseFloat(coefStr) || 1;

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

            if (value !== null && !isNaN(value)) {
                // Normalize to 20 for calculation simplicity?
                // Actually usually better to keep raw points * coef
                // But let's assume normalized to 20 for average calc
                const normalized = (value / scale) * 20;
                grouped[code].totalPoints += normalized * coef;
                grouped[code].totalCoef += coef;
            }
        });

        return Object.values(grouped)
            .map(s => ({
                ...s,
                average: s.totalCoef > 0 ? (s.totalPoints / s.totalCoef) : null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [periodGrades]);

    // --- AVERAGE CALCULATION LOGIC ---
    // 1. Try to get official general average
    let generalAverage = parseGradeValue(periodData?.ensembleMatieres?.moyenneGenerale);
    let classAverage = parseGradeValue(periodData?.ensembleMatieres?.moyenneClasse);
    let isEstimated = false;

    // 2. If missing, calculate it manually from subjects
    if (generalAverage === null && subjectsData.length > 0) {
        let sumAvgs = 0;
        let count = 0;
        subjectsData.forEach(sub => {
            if (sub.average !== null) {
                sumAvgs += sub.average;
                count++;
            }
        });
        if (count > 0) {
            generalAverage = sumAvgs / count;
            isEstimated = true;
        }
    }

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
                        <span className="gp-stat-label">
                            Moyenne générale {isEstimated && <small>(est.)</small>}
                        </span>
                        <span
                            className="gp-stat-value"
                            style={{ color: generalAverage ? getGradeColor(generalAverage) : undefined }}
                        >
                            {generalAverage ? generalAverage.toFixed(2) : '--'}
                            <small>/20</small>
                        </span>
                    </div>
                    {generalAverage && (
                        <div className="gp-stat-bar">
                            <div
                                className="gp-stat-bar-fill"
                                style={{
                                    width: `${Math.min((generalAverage / 20) * 100, 100)}%`,
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
                                    <div className="gp-subject-color" style={{ background: subject.color, boxShadow: `0 0 10px ${subject.color}66` }} />
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
                                                width: `${Math.min((subject.average / 20) * 100, 100)}%`,
                                                background: subject.color,
                                                boxShadow: `0 0 10px ${subject.color}`
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
