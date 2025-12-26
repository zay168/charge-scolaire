/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATISTICS PAGE
 * Clean, modern workload analytics with positioned tutorial
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useWorkload } from '../contexts/WorkloadContext';
import { DailyWorkloadChart, WeeklyWorkloadChart } from '../components/charts/WorkloadChart';
import './StatisticsPage.css';

export function StatisticsPage() {
    const {
        assignments,
        todayWorkload,
        weekWorkload,
        isLoading
    } = useWorkload();

    // Tutorial state
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState({});

    // Refs for tutorial targets
    const quickCardsRef = useRef(null);
    const chartsRef = useRef(null);
    const subjectsRef = useRef(null);
    const breakdownRef = useRef(null);

    // Tutorial steps configuration
    const tutorialSteps = [
        {
            ref: quickCardsRef,
            title: '📊 Vue rapide',
            description: 'Ces cartes montrent votre charge : points aujourd\'hui, cette semaine, nombre de travaux et taux de complétion.',
            position: 'bottom'
        },
        {
            ref: chartsRef,
            title: '📈 Graphiques',
            description: 'Visualisez l\'évolution de votre charge. Vert = léger, Jaune = modéré, Orange/Rouge = chargé.',
            position: 'bottom'
        },
        {
            ref: subjectsRef,
            title: '📚 Par matière',
            description: 'Chaque ligne = une matière. Bleu = devoirs, Rouge = évaluations. Les chiffres indiquent le nombre.',
            position: 'top'
        },
        {
            ref: breakdownRef,
            title: '🎯 Répartition',
            description: 'L\'anneau montre la proportion : bleu = devoirs, rouge = évaluations. Le chiffre central = total.',
            position: 'top'
        }
    ];

    // Calculate tooltip position
    const updateTooltipPosition = useCallback(() => {
        const currentStep = tutorialSteps[tutorialStep];
        if (!currentStep?.ref?.current) return;

        const rect = currentStep.ref.current.getBoundingClientRect();
        const pos = currentStep.position;

        let style = {};

        if (pos === 'bottom') {
            style = {
                top: rect.bottom + 16,
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)'
            };
        } else if (pos === 'top') {
            style = {
                top: rect.top - 16,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, -100%)'
            };
        } else if (pos === 'right') {
            style = {
                top: rect.top + rect.height / 2,
                left: rect.right + 16,
                transform: 'translateY(-50%)'
            };
        } else if (pos === 'left') {
            style = {
                top: rect.top + rect.height / 2,
                left: rect.left - 16,
                transform: 'translate(-100%, -50%)'
            };
        }

        setTooltipStyle(style);
    }, [tutorialStep, tutorialSteps]);

    // Check if first visit
    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('stats_tutorial_seen');
        if (!hasSeenTutorial && !isLoading && assignments.length > 0) {
            setTimeout(() => setShowTutorial(true), 500);
        }
    }, [isLoading, assignments.length]);

    // Update position when step changes
    useEffect(() => {
        if (showTutorial) {
            updateTooltipPosition();
            window.addEventListener('resize', updateTooltipPosition);
            window.addEventListener('scroll', updateTooltipPosition);
            return () => {
                window.removeEventListener('resize', updateTooltipPosition);
                window.removeEventListener('scroll', updateTooltipPosition);
            };
        }
    }, [showTutorial, tutorialStep, updateTooltipPosition]);

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('stats_tutorial_seen', 'true');
    };

    const nextStep = () => {
        if (tutorialStep < tutorialSteps.length - 1) {
            setTutorialStep(prev => prev + 1);
        } else {
            closeTutorial();
        }
    };

    // Generate daily chart data
    const dailyChartData = useMemo(() => {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dateMap = {};

        assignments.forEach(a => {
            if (!a.dueDate) return;
            try {
                const dueDate = new Date(a.dueDate);
                if (isNaN(dueDate.getTime())) return;

                const dueDateNorm = new Date(dueDate);
                dueDateNorm.setHours(0, 0, 0, 0);
                if (dueDateNorm < today) return;

                const dateStr = dueDate.toISOString().split('T')[0];

                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = {
                        day: dayNames[dueDate.getDay()],
                        date: dateStr,
                        score: 0,
                        count: 0,
                    };
                }

                dateMap[dateStr].count++;
                dateMap[dateStr].score += (a.type === 'test' ? 3 : 1);
            } catch {
                // Skip
            }
        });

        return Object.values(dateMap)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10);
    }, [assignments]);

    // Generate weekly chart data
    const weeklyChartData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const weekAssignments = assignments.filter(a => {
                if (!a.dueDate) return false;
                const dueDate = new Date(a.dueDate);
                if (isNaN(dueDate.getTime())) return false;
                return dueDate >= weekStart && dueDate <= weekEnd;
            });

            const score = weekAssignments.reduce((total, a) =>
                total + (a.type === 'test' ? 3 : 1), 0);

            const testCount = weekAssignments.filter(a => a.type === 'test').length;
            const homeworkCount = weekAssignments.length - testCount;

            const formatMonth = (d) => d.toLocaleDateString('fr-FR', { month: 'short' });
            const weekLabel = `${weekStart.getDate()}-${weekEnd.getDate()} ${formatMonth(weekEnd)}`;

            weeks.push({
                week: weekLabel,
                weekNumber: i + 1,
                score,
                count: weekAssignments.length,
                testCount,
                homeworkCount,
                isCurrent: i === 0,
            });
        }

        return weeks;
    }, [assignments]);

    // Subject distribution
    const subjectStats = useMemo(() => {
        const subjects = {};
        assignments.forEach(a => {
            const subject = a.subject || 'Autre';
            if (!subjects[subject]) {
                subjects[subject] = { count: 0, tests: 0, homework: 0 };
            }
            subjects[subject].count++;
            if (a.type === 'test') {
                subjects[subject].tests++;
            } else {
                subjects[subject].homework++;
            }
        });

        return Object.entries(subjects)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [assignments]);

    // Type stats
    const typeStats = useMemo(() => {
        const tests = assignments.filter(a => a.type === 'test').length;
        const homework = assignments.length - tests;
        return { tests, homework, total: assignments.length };
    }, [assignments]);

    // Completion rate
    const completionRate = useMemo(() => {
        if (assignments.length === 0) return 0;
        const done = assignments.filter(a => a.done).length;
        return Math.round((done / assignments.length) * 100);
    }, [assignments]);

    // Calculate percentages for donut
    const homeworkPercent = typeStats.total > 0 ? (typeStats.homework / typeStats.total) * 100 : 0;
    const testsPercent = typeStats.total > 0 ? (typeStats.tests / typeStats.total) * 100 : 0;

    // Get status color
    const getStatusColor = (score, type = 'daily') => {
        const thresholds = type === 'daily'
            ? { light: 2, medium: 4, heavy: 6 }
            : { light: 8, medium: 15, heavy: 20 };

        if (score <= thresholds.light) return 'var(--color-success)';
        if (score <= thresholds.medium) return 'var(--color-warning)';
        if (score <= thresholds.heavy) return 'var(--color-danger)';
        return 'var(--color-critical)';
    };

    if (isLoading) {
        return (
            <div className="stats-page stats-page--loading">
                <div className="stats-loader">
                    <div className="stats-loader__spinner"></div>
                    <p>Chargement des statistiques...</p>
                </div>
            </div>
        );
    }

    const currentStep = tutorialSteps[tutorialStep];

    return (
        <div className="stats-page">
            {/* Tutorial Overlay */}
            {showTutorial && (
                <>
                    <div className="tutorial-overlay" onClick={closeTutorial} />
                    <div
                        className={`tutorial-tooltip tutorial-tooltip--${currentStep.position}`}
                        style={tooltipStyle}
                    >
                        <div className="tutorial-tooltip__content">
                            <span className="tutorial-tooltip__step">
                                {tutorialStep + 1}/{tutorialSteps.length}
                            </span>
                            <h3 className="tutorial-tooltip__title">
                                {currentStep.title}
                            </h3>
                            <p className="tutorial-tooltip__desc">
                                {currentStep.description}
                            </p>
                            <div className="tutorial-tooltip__actions">
                                <button className="tutorial-tooltip__skip" onClick={closeTutorial}>
                                    Passer
                                </button>
                                <button className="tutorial-tooltip__next" onClick={nextStep}>
                                    {tutorialStep < tutorialSteps.length - 1 ? 'Suivant →' : 'Terminé ✓'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Header */}
            <header className="stats-header">
                <div>
                    <h1 className="stats-header__title">📊 Statistiques</h1>
                    <p className="stats-header__subtitle">Vue d'ensemble de votre charge de travail</p>
                </div>
                <button
                    className="stats-header__help"
                    onClick={() => { setTutorialStep(0); setShowTutorial(true); }}
                    title="Voir le tutoriel"
                >
                    ❓
                </button>
            </header>

            {/* Quick Stats */}
            <div
                ref={quickCardsRef}
                className={`stats-quick ${showTutorial && tutorialStep === 0 ? 'tutorial-highlight' : ''}`}
            >
                <div className="quick-card">
                    <div className="quick-card__icon">📅</div>
                    <div className="quick-card__data">
                        <span className="quick-card__value">{todayWorkload?.score || 0}</span>
                        <span className="quick-card__unit">pts</span>
                    </div>
                    <span className="quick-card__label">Aujourd'hui</span>
                    <div
                        className="quick-card__indicator"
                        style={{ background: getStatusColor(todayWorkload?.score || 0, 'daily') }}
                    />
                </div>

                <div className="quick-card">
                    <div className="quick-card__icon">📆</div>
                    <div className="quick-card__data">
                        <span className="quick-card__value">{weekWorkload?.score || 0}</span>
                        <span className="quick-card__unit">pts</span>
                    </div>
                    <span className="quick-card__label">Cette semaine</span>
                    <div
                        className="quick-card__indicator"
                        style={{ background: getStatusColor(weekWorkload?.score || 0, 'weekly') }}
                    />
                </div>

                <div className="quick-card">
                    <div className="quick-card__icon">📚</div>
                    <div className="quick-card__data">
                        <span className="quick-card__value">{typeStats.total}</span>
                    </div>
                    <span className="quick-card__label">Travaux à venir</span>
                </div>

                <div className="quick-card quick-card--accent">
                    <div className="quick-card__icon">✅</div>
                    <div className="quick-card__data">
                        <span className="quick-card__value">{completionRate}</span>
                        <span className="quick-card__unit">%</span>
                    </div>
                    <span className="quick-card__label">Complétés</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="stats-content">
                {/* Charts Row */}
                <div
                    ref={chartsRef}
                    className={`stats-charts ${showTutorial && tutorialStep === 1 ? 'tutorial-highlight' : ''}`}
                >
                    <section className="stats-card stats-card--wide">
                        <h2 className="stats-card__title">📈 Charge journalière</h2>
                        <div className="stats-card__chart">
                            {dailyChartData.length > 0 ? (
                                <DailyWorkloadChart data={dailyChartData} height={250} />
                            ) : (
                                <div className="stats-empty">
                                    <span>📭</span>
                                    <p>Aucun travail programmé</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="stats-card">
                        <h2 className="stats-card__title">📊 Évolution hebdomadaire</h2>
                        <div className="stats-card__chart">
                            <WeeklyWorkloadChart data={weeklyChartData} height={250} />
                        </div>
                    </section>
                </div>

                {/* Bottom Row */}
                <div className="stats-details">
                    {/* Subject breakdown */}
                    <section
                        ref={subjectsRef}
                        className={`stats-card ${showTutorial && tutorialStep === 2 ? 'tutorial-highlight' : ''}`}
                    >
                        <h2 className="stats-card__title">
                            📚 Par matière
                            <span className="stats-card__legend">
                                <span className="legend-dot legend-dot--blue"></span> devoirs
                                <span className="legend-dot legend-dot--red"></span> évaluations
                            </span>
                        </h2>
                        <div className="subject-list">
                            {subjectStats.length > 0 ? (
                                subjectStats.map((subject, idx) => (
                                    <div key={subject.name} className="subject-item">
                                        <div className="subject-item__rank">#{idx + 1}</div>
                                        <div className="subject-item__info">
                                            <span className="subject-item__name">{subject.name}</span>
                                            <div className="subject-item__bar-container">
                                                <div
                                                    className="subject-item__bar subject-item__bar--homework"
                                                    style={{
                                                        width: `${(subject.homework / subject.count) * 100}%`
                                                    }}
                                                />
                                                <div
                                                    className="subject-item__bar subject-item__bar--test"
                                                    style={{
                                                        width: `${(subject.tests / subject.count) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="subject-item__tags">
                                            <span className="subject-item__tag subject-item__tag--homework">
                                                {subject.homework}
                                            </span>
                                            <span className="subject-item__tag subject-item__tag--test">
                                                {subject.tests}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="stats-empty">
                                    <p>Aucune matière</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Type breakdown */}
                    <section
                        ref={breakdownRef}
                        className={`stats-card ${showTutorial && tutorialStep === 3 ? 'tutorial-highlight' : ''}`}
                    >
                        <h2 className="stats-card__title">📋 Répartition des travaux</h2>
                        <div className="type-breakdown">
                            <div className="type-donut">
                                <svg viewBox="0 0 42 42" className="type-donut__chart">
                                    <circle
                                        className="type-donut__bg"
                                        cx="21" cy="21" r="15.9"
                                        fill="none"
                                        strokeWidth="6"
                                    />
                                    <circle
                                        className="type-donut__segment type-donut__segment--homework"
                                        cx="21" cy="21" r="15.9"
                                        fill="none"
                                        strokeWidth="6"
                                        strokeDasharray={`${homeworkPercent} ${100 - homeworkPercent}`}
                                        strokeDashoffset="25"
                                    />
                                    <circle
                                        className="type-donut__segment type-donut__segment--test"
                                        cx="21" cy="21" r="15.9"
                                        fill="none"
                                        strokeWidth="6"
                                        strokeDasharray={`${testsPercent} ${100 - testsPercent}`}
                                        strokeDashoffset={25 - homeworkPercent}
                                    />
                                </svg>
                                <div className="type-donut__center">
                                    <span className="type-donut__total">{typeStats.total}</span>
                                    <span className="type-donut__label">travaux</span>
                                </div>
                            </div>

                            <div className="type-legend">
                                <div className="type-legend__item">
                                    <div className="type-legend__color type-legend__color--homework"></div>
                                    <div className="type-legend__info">
                                        <span className="type-legend__name">📝 Devoirs</span>
                                        <span className="type-legend__desc">1 point chacun</span>
                                    </div>
                                    <div className="type-legend__value">
                                        <span className="type-legend__count">{typeStats.homework}</span>
                                        <span className="type-legend__percent">
                                            ({Math.round(homeworkPercent)}%)
                                        </span>
                                    </div>
                                </div>
                                <div className="type-legend__item">
                                    <div className="type-legend__color type-legend__color--test"></div>
                                    <div className="type-legend__info">
                                        <span className="type-legend__name">📋 Évaluations</span>
                                        <span className="type-legend__desc">3 points chacune</span>
                                    </div>
                                    <div className="type-legend__value">
                                        <span className="type-legend__count">{typeStats.tests}</span>
                                        <span className="type-legend__percent">
                                            ({Math.round(testsPercent)}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default StatisticsPage;
