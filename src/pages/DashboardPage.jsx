/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DASHBOARD PAGE
 * Main dashboard showing workload overview and assignments
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkload } from '../contexts/WorkloadContext';
import { LoadIndicator, LoadProgressBar } from '../components/ui/LoadIndicator';
import { AssignmentCard, AssignmentCardSkeleton } from '../components/ui/AssignmentCard';
import { DailyWorkloadChart, WeeklyWorkloadChart, SubjectDistributionChart } from '../components/charts/WorkloadChart';
import './DashboardPage.css';

export function DashboardPage() {
    const { user, userType } = useAuth();
    const {
        assignments,
        todayWorkload,
        weekWorkload,
        stats,
        isLoading,
        dstAnalysis,
    } = useWorkload();

    // Get greeting based on time of day
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bonjour';
        if (hour < 18) return 'Bon après-midi';
        return 'Bonsoir';
    }, []);

    // Generate daily data from actual assignments (skip empty days, look further ahead)
    const dailyChartData = useMemo(() => {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all unique dates from assignments that are today or in the future
        const dateMap = {};

        assignments.forEach(a => {
            if (!a.dueDate) return;
            try {
                const dueDate = new Date(a.dueDate);
                if (isNaN(dueDate.getTime())) return;

                // Only include today and future dates
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
                        assignments: []
                    };
                }

                dateMap[dateStr].count++;
                dateMap[dateStr].score += (a.type === 'test' ? 3 : 1);
                dateMap[dateStr].assignments.push(a);
            } catch {
                // Skip invalid dates
            }
        });

        // Convert to array and sort by date, limit to 7 days with assignments
        return Object.values(dateMap)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 7);
    }, [assignments]);

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

            // Calculate score: évaluation = 3pts, devoir = 1pt
            let score = weekAssignments.reduce((total, a) => {
                return total + (a.type === 'test' ? 3 : 1);
            }, 0);

            // Count tests
            const testCount = weekAssignments.filter(a => a.type === 'test').length;
            const homeworkCount = weekAssignments.length - testCount;

            // Format week label: "6-12 janv."
            const formatShortDate = (d) => d.getDate();
            const formatMonth = (d) => d.toLocaleDateString('fr-FR', { month: 'short' });
            const weekLabel = `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)} ${formatMonth(weekEnd)}`;

            weeks.push({
                week: weekLabel,
                weekNumber: i + 1,
                score,
                count: weekAssignments.length,
                testCount,
                homeworkCount,
                isCurrent: i === 0,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
            });
        }

        return weeks;
    }, [assignments]);

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard__header">
                <div className="dashboard__greeting">
                    <h1 className="dashboard__title">
                        {greeting}, <span className="dashboard__name">{user?.firstName}</span> 👋
                    </h1>
                    <p className="dashboard__subtitle">
                        {userType === 'teacher'
                            ? 'Voici la charge de vos classes'
                            : 'Voici votre charge de travail'
                        }
                    </p>
                </div>

                <div className="dashboard__date">
                    {new Date().toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                    })}
                </div>
            </header>

            {/* Stats Cards */}
            <section className="dashboard__stats">
                <article className="stat-card stat-card--today">
                    <div className="stat-card__header">
                        <span className="stat-card__icon">📅</span>
                        <h3 className="stat-card__title">Aujourd'hui</h3>
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{todayWorkload.count}</div>
                        <div className="stat-card__label">
                            {todayWorkload.count === 1 ? 'devoir' : 'devoirs'}
                        </div>
                    </div>
                    <LoadProgressBar
                        score={todayWorkload.score}
                        maxScore={15}
                        status={todayWorkload.status}
                        height={6}
                    />
                </article>

                <article className="stat-card stat-card--week">
                    <div className="stat-card__header">
                        <span className="stat-card__icon">📊</span>
                        <h3 className="stat-card__title">Cette semaine</h3>
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{weekWorkload.count}</div>
                        <div className="stat-card__label">
                            {weekWorkload.count === 1 ? 'travail' : 'travaux'}
                        </div>
                    </div>
                    <LoadProgressBar
                        score={weekWorkload.score}
                        maxScore={35}
                        status={weekWorkload.status}
                        height={6}
                    />
                </article>

                <article className="stat-card stat-card--dst">
                    <div className="stat-card__header">
                        <span className="stat-card__icon">📝</span>
                        <h3 className="stat-card__title">DSTs à venir</h3>
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{dstAnalysis.total}</div>
                        <div className="stat-card__label">
                            {dstAnalysis.total === 1 ? 'DST programmé' : 'DSTs programmés'}
                        </div>
                    </div>
                    {dstAnalysis.hasHighSeverity && (
                        <div className="stat-card__warning">
                            ⚠️ {dstAnalysis.warnings.length} alertes
                        </div>
                    )}
                </article>

                <article className="stat-card stat-card--average">
                    <div className="stat-card__header">
                        <span className="stat-card__icon">📈</span>
                        <h3 className="stat-card__title">Charge moyenne</h3>
                    </div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{stats.averageDailyLoad || 0}</div>
                        <div className="stat-card__label">points/jour</div>
                    </div>
                    <LoadIndicator
                        status={stats.averageDailyLoad > 7 ? 'heavy' : stats.averageDailyLoad > 4 ? 'medium' : 'light'}
                        showLabel
                        size="small"
                    />
                </article>
            </section>

            {/* Main content grid */}
            <div className="dashboard__grid">
                {/* Upcoming assignments */}
                <section className="dashboard__section dashboard__section--assignments">
                    <div className="dashboard__section-header">
                        <h2 className="dashboard__section-title">
                            <span>📝</span> Prochains devoirs
                        </h2>
                        <Link to="/assignments" className="dashboard__section-link">
                            Voir tout →
                        </Link>
                    </div>

                    <div className="dashboard__daily-tree">
                        {isLoading ? (
                            <>
                                <AssignmentCardSkeleton />
                                <AssignmentCardSkeleton />
                            </>
                        ) : dailyChartData.length > 0 ? (
                            dailyChartData.map(day => {
                                // Group assignments by subject for this day
                                const bySubject = (day.assignments || []).reduce((acc, a) => {
                                    const subject = a.subject || 'Autre';
                                    if (!acc[subject]) acc[subject] = [];
                                    acc[subject].push(a);
                                    return acc;
                                }, {});

                                // Get status based on score
                                const getStatus = (score) => {
                                    if (score <= 2) return 'light';
                                    if (score <= 4) return 'medium';
                                    if (score <= 6) return 'heavy';
                                    return 'critical';
                                };

                                const status = getStatus(day.score);
                                const statusLabels = {
                                    light: 'Léger',
                                    medium: 'Modéré',
                                    heavy: 'Chargé',
                                    critical: 'Critique'
                                };

                                return (
                                    <div key={day.date} className={`day-tree day-tree--${status}`}>
                                        <div className="day-tree__header">
                                            <div className="day-tree__date">
                                                <span className="day-tree__day-name">{day.day}</span>
                                                <span className="day-tree__full-date">
                                                    {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <div className="day-tree__stats">
                                                <span className={`day-tree__status day-tree__status--${status}`}>
                                                    {statusLabels[status]}
                                                </span>
                                                <span className="day-tree__score">{day.score} pts</span>
                                            </div>
                                        </div>

                                        <div className="day-tree__subjects">
                                            {Object.entries(bySubject).map(([subject, subjectAssignments]) => (
                                                <div key={subject} className="subject-branch">
                                                    <div className="subject-branch__header">
                                                        <span className="subject-branch__icon">📚</span>
                                                        <span className="subject-branch__name">{subject}</span>
                                                        <span className="subject-branch__count">
                                                            {subjectAssignments.length} {subjectAssignments.length > 1 ? 'travaux' : 'travail'}
                                                        </span>
                                                    </div>
                                                    <div className="subject-branch__items">
                                                        {subjectAssignments.map(a => (
                                                            <div
                                                                key={a.id}
                                                                className={`assignment-leaf ${a.type === 'test' ? 'assignment-leaf--test' : ''} ${a.done ? 'assignment-leaf--done' : ''}`}
                                                            >
                                                                <span className="assignment-leaf__icon">
                                                                    {a.type === 'test' ? '📋' : '📝'}
                                                                </span>
                                                                <span className="assignment-leaf__type">
                                                                    {a.type === 'test' ? 'Évaluation' : 'Devoir'}
                                                                </span>
                                                                {a.done && <span className="assignment-leaf__done">✓</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="dashboard__empty">
                                <span>🎉</span>
                                <p>Aucun devoir à venir !</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Daily chart */}
                <section className="dashboard__section dashboard__section--chart">
                    <div className="dashboard__section-header">
                        <h2 className="dashboard__section-title">
                            <span>📊</span> Charge par jour
                        </h2>
                    </div>
                    <div className="dashboard__chart-container">
                        <DailyWorkloadChart data={dailyChartData} height={220} />
                    </div>
                </section>

                {/* Weekly chart */}
                <section className="dashboard__section dashboard__section--chart">
                    <div className="dashboard__section-header">
                        <h2 className="dashboard__section-title">
                            <span>📈</span> Évolution hebdomadaire
                        </h2>
                    </div>
                    <div className="dashboard__chart-container">
                        <WeeklyWorkloadChart data={weeklyChartData} height={220} />
                    </div>
                </section>

                {/* Subject distribution */}
                {stats.bySubject && Object.keys(stats.bySubject).length > 0 && (
                    <section className="dashboard__section dashboard__section--subjects">
                        <div className="dashboard__section-header">
                            <h2 className="dashboard__section-title">
                                <span>📚</span> Par matière
                            </h2>
                        </div>
                        <div className="dashboard__chart-container">
                            <SubjectDistributionChart
                                data={stats.bySubject}
                                height={Object.keys(stats.bySubject).length * 40 + 40}
                            />
                        </div>
                    </section>
                )}

                {/* DST Warnings */}
                {dstAnalysis.warnings.length > 0 && (
                    <section className="dashboard__section dashboard__section--warnings">
                        <div className="dashboard__section-header">
                            <h2 className="dashboard__section-title">
                                <span>⚠️</span> Alertes DST
                            </h2>
                        </div>
                        <div className="dashboard__warnings-list">
                            {dstAnalysis.warnings.slice(0, 3).map((warning, index) => (
                                <div
                                    key={index}
                                    className={`dashboard__warning dashboard__warning--${warning.severity}`}
                                >
                                    <span className="dashboard__warning-icon">
                                        {warning.severity === 'high' ? '🔴' : warning.severity === 'medium' ? '🟠' : '🟡'}
                                    </span>
                                    <p className="dashboard__warning-message">{warning.message}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Quick actions for teachers */}
            {userType === 'teacher' && (
                <section className="dashboard__actions">
                    <a href="/add-assignment" className="dashboard__action-btn btn btn--primary">
                        ➕ Ajouter un devoir
                    </a>
                    <a href="/calendar" className="dashboard__action-btn btn btn--secondary">
                        📅 Planifier un DST
                    </a>
                </section>
            )}
        </div>
    );
}

export default DashboardPage;
