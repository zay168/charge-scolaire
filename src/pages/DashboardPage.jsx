/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DASHBOARD PAGE
 * Main dashboard showing workload overview and assignments
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkload } from '../contexts/WorkloadContext';
import { LoadIndicator, LoadProgressBar } from '../components/ui/LoadIndicator';
import { AssignmentCard, AssignmentCardSkeleton } from '../components/ui/AssignmentCard';
import { DailyWorkloadChart, WeeklyWorkloadChart, SubjectDistributionChart } from '../components/charts/WorkloadChart';
import { generateMockDailyStats, generateMockWeeklyStats } from '../data/mockData';
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

    // Filter upcoming assignments
    const upcomingAssignments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return assignments
            .filter(a => new Date(a.dueDate) >= today && !a.done)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
    }, [assignments]);

    // Generate chart data
    const dailyChartData = useMemo(() => generateMockDailyStats(), []);
    const weeklyChartData = useMemo(() => generateMockWeeklyStats(), []);

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
                        <a href="/assignments" className="dashboard__section-link">
                            Voir tout →
                        </a>
                    </div>

                    <div className="dashboard__assignments-list">
                        {isLoading ? (
                            <>
                                <AssignmentCardSkeleton />
                                <AssignmentCardSkeleton />
                                <AssignmentCardSkeleton />
                            </>
                        ) : upcomingAssignments.length > 0 ? (
                            upcomingAssignments.map(assignment => (
                                <AssignmentCard
                                    key={assignment.id}
                                    assignment={assignment}
                                    showClass={userType === 'teacher'}
                                />
                            ))
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
