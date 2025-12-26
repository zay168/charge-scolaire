/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASSIGNMENTS PAGE - Premium Cahier de Textes
 * Inspired by Ecole Directe with enhanced aesthetics
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWorkload } from '../contexts/WorkloadContext';
import ecoleDirecteClient from '../api/ecoleDirecte';
import './AssignmentsPage.css';

// Helper: Format date for display
function formatDateFull(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).toUpperCase();
}

function formatGivenDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `Donné le ${date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    })}`;
}

// Mini Calendar Component
function MiniCalendar({ currentMonth, setCurrentMonth, datesWithHomework, onDateClick }) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const dayNames = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

    // Get days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();

    // Build calendar days
    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        days.push({ day: prevMonthLastDay - i, isOtherMonth: true, date: null });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = todayStr === dateStr;
        const isPast = dateStr < todayStr;
        const hasHomework = datesWithHomework.has(dateStr);
        days.push({ day: d, isOtherMonth: false, date: dateStr, isToday, isPast, hasHomework });
    }

    // Next month days
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isOtherMonth: true, date: null });
        }
    }

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const handleDayClick = (d) => {
        if (!d.date) return;
        if (d.hasHomework) {
            onDateClick(d.date);
        }
        // Do nothing if no homework on that date
    };

    return (
        <div className="mini-calendar">
            <div className="mini-calendar__header">
                <span className="mini-calendar__title">{monthNames[month]} {year}</span>
                <div className="mini-calendar__nav">
                    <button onClick={goToPrevMonth}>‹</button>
                    <button onClick={goToNextMonth}>›</button>
                </div>
            </div>
            <div className="mini-calendar__grid">
                {dayNames.map(d => (
                    <div key={d} className="mini-calendar__day-name">{d}</div>
                ))}
                {days.map((d, idx) => (
                    <div
                        key={idx}
                        className={`mini-calendar__day 
                            ${d.isOtherMonth ? 'mini-calendar__day--other-month' : ''}
                            ${d.isToday ? 'mini-calendar__day--today' : ''}
                            ${d.isPast && !d.hasHomework ? 'mini-calendar__day--past' : ''}
                            ${d.hasHomework ? 'mini-calendar__day--has-homework' : ''}
                        `}
                        onClick={() => handleDayClick(d)}
                        style={{ cursor: d.hasHomework ? 'pointer' : 'default' }}
                    >
                        {d.day}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AssignmentsPage() {
    const { assignments: contextAssignments, isLoading, fetchData } = useWorkload();

    // Local state
    const [localAssignments, setLocalAssignments] = useState([]);
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [updatingIds, setUpdatingIds] = useState(new Set());
    const [loadingPast, setLoadingPast] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Sync local state with context
    useEffect(() => {
        setLocalAssignments(contextAssignments);
    }, [contextAssignments]);

    const assignments = localAssignments;

    // Load past homework
    const loadPastHomework = useCallback(async () => {
        setLoadingPast(true);
        try {
            const existingDates = localAssignments.map(a => a.dueDate).filter(Boolean).sort();
            const startDate = existingDates.length > 0 ? new Date(existingDates[0]) : new Date();
            const pastAssignments = [];

            for (let i = 1; i <= 14; i++) {
                const pastDate = new Date(startDate);
                pastDate.setDate(startDate.getDate() - i);
                const dateStr = pastDate.toISOString().split('T')[0];

                try {
                    const homework = await ecoleDirecteClient.getHomework(dateStr);
                    if (Array.isArray(homework) && homework.length > 0) {
                        pastAssignments.push(...homework);
                    }
                } catch {
                    // Date may have no homework
                }
            }

            setLocalAssignments(prev => {
                const existingIds = new Set(prev.map(a => a.id));
                const newOnes = pastAssignments.filter(a => !existingIds.has(a.id));
                return [...newOnes, ...prev].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            });
        } catch (err) {
            console.error('Failed to load past homework:', err);
        } finally {
            setLoadingPast(false);
        }
    }, [localAssignments]);

    // Get unique subjects
    const subjects = useMemo(() => {
        const subjectSet = new Set(assignments.map(a => a.subject).filter(Boolean));
        return Array.from(subjectSet).sort();
    }, [assignments]);

    // Filter assignments
    const filteredAssignments = useMemo(() => {
        return assignments.filter(a =>
            subjectFilter === 'all' || a.subject === subjectFilter
        );
    }, [assignments, subjectFilter]);

    // Group by date
    const groupedByDate = useMemo(() => {
        const groups = {};
        filteredAssignments.forEach(a => {
            const date = a.dueDate || '_no_date';
            if (!groups[date]) groups[date] = [];
            groups[date].push(a);
        });
        return Object.entries(groups).sort(([a], [b]) => new Date(a) - new Date(b));
    }, [filteredAssignments]);

    // Dates with homework (for calendar)
    const datesWithHomework = useMemo(() => {
        return new Set(assignments.map(a => a.dueDate).filter(Boolean));
    }, [assignments]);

    // Stats
    const stats = useMemo(() => ({
        total: assignments.length,
        done: assignments.filter(a => a.done).length,
        tests: assignments.filter(a => a.type === 'test').length,
    }), [assignments]);

    // Toggle done status (optimistic)
    const toggleDone = useCallback(async (assignment) => {
        if (updatingIds.has(assignment.id)) return;

        const newDoneState = !assignment.done;
        const previousState = assignment.done;

        setLocalAssignments(prev => prev.map(a =>
            a.id === assignment.id ? { ...a, done: newDoneState } : a
        ));
        setUpdatingIds(prev => new Set([...prev, assignment.id]));

        try {
            if (newDoneState) {
                await ecoleDirecteClient.setHomeworkDone([assignment.id], []);
            } else {
                await ecoleDirecteClient.setHomeworkDone([], [assignment.id]);
            }
        } catch (err) {
            console.error('Failed to toggle homework status:', err);
            setLocalAssignments(prev => prev.map(a =>
                a.id === assignment.id ? { ...a, done: previousState } : a
            ));
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(assignment.id);
                return next;
            });
        }
    }, [updatingIds]);

    // Download file from homework (CDT)
    const downloadFile = async (file) => {
        try {
            // For homework attachments, use FICHIER_CDT type
            const fileType = file.type || 'FICHIER_CDT';
            const blob = await ecoleDirecteClient.downloadDocument(file.id, fileType);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.libelle || file.name || 'document';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download:', err);
            alert('Erreur lors du téléchargement. Réessayez.');
        }
    };

    // Calendar date click
    const handleCalendarDateClick = (dateStr) => {
        const element = document.getElementById(`date-${dateStr}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading) {
        return (
            <div className="homeworks-page">
                <div className="homeworks-loading">
                    <div className="spinner" />
                    <p>Chargement des devoirs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="homeworks-page">
            {/* Header */}
            <header className="homeworks-header">
                <div className="homeworks-header__left">
                    <h1>📚 Cahier de textes</h1>
                    <p>Tous vos devoirs à venir</p>
                </div>
                <button
                    className="homeworks-refresh"
                    onClick={() => fetchData()}
                    disabled={isLoading}
                >
                    🔄 Actualiser
                </button>
            </header>

            {/* Main content */}
            <div className="homeworks-content">
                {/* Sidebar */}
                <aside className="homeworks-sidebar">
                    {/* Mini Calendar */}
                    <MiniCalendar
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        datesWithHomework={datesWithHomework}
                        onDateClick={handleCalendarDateClick}
                    />

                    {/* Stats */}
                    <div className="homeworks-stats">
                        <div className="stat-pill stat-pill--success">
                            <span className="stat-pill__icon">✓</span>
                            <span className="stat-pill__value">{stats.done}</span>
                            <span className="stat-pill__label">Terminés</span>
                        </div>
                        <div className="stat-pill">
                            <span className="stat-pill__icon">📚</span>
                            <span className="stat-pill__value">{stats.total}</span>
                            <span className="stat-pill__label">Total</span>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="homeworks-filter">
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                            <option value="all">Toutes les matières</option>
                            {subjects.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Load Past */}
                    <button
                        className="load-past-btn"
                        onClick={loadPastHomework}
                        disabled={loadingPast}
                    >
                        {loadingPast ? '⏳ Chargement...' : '📅 Charger les devoirs passés'}
                    </button>
                </aside>

                {/* Main List */}
                <main className="homeworks-main">
                    <div className="homeworks-main__title">
                        Tous les devoirs à venir
                    </div>

                    {groupedByDate.length === 0 ? (
                        <div className="homeworks-empty">
                            <span>🎉</span>
                            <p>Aucun devoir à faire !</p>
                        </div>
                    ) : (
                        groupedByDate.map(([date, items]) => (
                            <div key={date} id={`date-${date}`} className="homework-date-group">
                                <div className="homework-date-group__header">
                                    <span className="homework-date-group__date">
                                        {date === '_no_date' ? 'Date non définie' : formatDateFull(date)}
                                    </span>
                                </div>
                                <div className="homework-date-group__items">
                                    {items.map(assignment => (
                                        <div
                                            key={assignment.id}
                                            className={`homework-item ${assignment.done ? 'done' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <label className="homework-item__checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={assignment.done || false}
                                                    onChange={() => toggleDone(assignment)}
                                                    disabled={updatingIds.has(assignment.id)}
                                                />
                                                <span className="homework-item__checkmark">
                                                    {assignment.done ? '✓' : ''}
                                                </span>
                                            </label>

                                            {/* Content */}
                                            <div className="homework-item__content">
                                                <div className="homework-item__header">
                                                    <span className="homework-item__subject">
                                                        {assignment.subject}
                                                    </span>
                                                    {assignment.type === 'test' && (
                                                        <span className="homework-item__badge homework-item__badge--test">
                                                            Contrôle
                                                        </span>
                                                    )}
                                                    <span className="homework-item__given">
                                                        {formatGivenDate(assignment.givenDate)}
                                                    </span>
                                                </div>

                                                {assignment.content && (
                                                    <div
                                                        className="homework-item__description"
                                                        dangerouslySetInnerHTML={{ __html: assignment.content }}
                                                    />
                                                )}

                                                {/* Files */}
                                                {assignment.files && assignment.files.length > 0 ? (
                                                    <div className="homework-item__files">
                                                        {assignment.files.map((file, idx) => (
                                                            <button
                                                                key={idx}
                                                                className="homework-item__file"
                                                                onClick={() => downloadFile(file)}
                                                            >
                                                                📎 {file.libelle || file.name || 'Document'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : assignment.hasFiles ? (
                                                    <div className="homework-item__files-indicator">
                                                        📎 Pièces jointes disponibles
                                                    </div>
                                                ) : null}

                                                {/* Session content */}
                                                {assignment.sessionContent && (
                                                    <details className="homework-item__session">
                                                        <summary>📖 Contenu de séance</summary>
                                                        <div
                                                            className="homework-item__session-content"
                                                            dangerouslySetInnerHTML={{ __html: assignment.sessionContent }}
                                                        />
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </main>

            </div>
        </div>
    );
}

export default AssignmentsPage;
