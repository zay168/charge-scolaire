import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import { getAllClassesWorkload, getClassWorkloadDetails, getLoadStatusInfo } from '../../services/workloadService';
import './TeacherWorkload.css';

export default function TeacherWorkload() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [workloadData, setWorkloadData] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [dateDetails, setDateDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('calendar'); // calendar | list

    // Month navigation state
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Navigate months
    const goToPrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    // Date range based on current month (full month + buffer)
    const dateRange = useMemo(() => {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0); // Last day of month
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }, [currentMonth]);

    // Month display name
    const monthDisplay = useMemo(() => {
        return currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }, [currentMonth]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Get teacher's classes from ED
            const teacherClasses = await realEcoleDirecteClient.getClasses();
            setClasses(teacherClasses || []);

            // Get workload data from Supabase for selected month
            const data = await getAllClassesWorkload(dateRange.start, dateRange.end);
            setWorkloadData(data);
        } catch (e) {
            console.error('Failed to load workload data:', e);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    // Reload when month changes
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDateClick = async (className, date) => {
        setSelectedDate({ className, date });
        const details = await getClassWorkloadDetails(className, date);
        setDateDetails(details);
    };

    // Generate calendar days for selected month
    const calendarDays = useMemo(() => {
        const today = new Date();
        const days = [];

        // Get first day of the selected month
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        // Find Monday of the week containing the 1st
        const startOfWeek = new Date(firstDay);
        const dayOfWeek = startOfWeek.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(startOfWeek.getDate() + diff);

        // Generate 6 weeks (42 days) to fill the calendar grid
        for (let i = 0; i < 42; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            days.push({
                date: date.toISOString().split('T')[0],
                dayOfMonth: date.getDate(),
                isToday: date.toDateString() === today.toDateString(),
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                isSaturday: date.getDay() === 6,
                month: date.getMonth(),
                isCurrentMonth: date.getMonth() === currentMonth.getMonth()
            });
        }
        return days;
    }, [currentMonth]);

    // Get workload for a specific class and date
    const getWorkloadForDate = (className, date) => {
        const classData = workloadData[className] || [];
        return classData.find(d => d.score_date === date);
    };

    if (loading) {
        return (
            <div className="tw-page">
                <div className="tw-loading">
                    <div className="tw-spinner"></div>
                    <p>Chargement des données de charge...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tw-page">
            {/* Header */}
            <div className="tw-header">
                <div className="tw-header__left">
                    <h1 className="tw-header__title">📊 Charge de travail des élèves</h1>
                    <p className="tw-header__subtitle">
                        Visualisez la charge de devoirs par classe (données synchronisées par les élèves)
                    </p>
                </div>
                <div className="tw-header__actions">
                    <div className="tw-view-toggle">
                        <button
                            className={`tw-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            📅 Calendrier
                        </button>
                        <button
                            className={`tw-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            📋 Liste
                        </button>
                    </div>
                </div>
            </div>

            {/* Month Navigation */}
            <div className="tw-month-nav">
                <button className="tw-month-nav__btn" onClick={goToPrevMonth}>◀</button>
                <div className="tw-month-nav__current">
                    <span className="tw-month-nav__label">{monthDisplay}</span>
                    <button className="tw-month-nav__today" onClick={goToToday}>Aujourd'hui</button>
                </div>
                <button className="tw-month-nav__btn" onClick={goToNextMonth}>▶</button>
            </div>

            {/* Legend */}
            <div className="tw-legend">
                <span className="tw-legend__title">Légende :</span>
                <div className="tw-legend__item tw-legend__item--light">🟢 Léger (≤2)</div>
                <div className="tw-legend__item tw-legend__item--medium">🟠 Modéré (3-4)</div>
                <div className="tw-legend__item tw-legend__item--heavy">🔴 Chargé (5-6)</div>
                <div className="tw-legend__item tw-legend__item--critical">❌ Critique (&gt;6)</div>
            </div>

            {/* Class selector */}
            <div className="tw-class-selector">
                <button
                    className={`tw-class-chip ${!selectedClass ? 'active' : ''}`}
                    onClick={() => setSelectedClass(null)}
                >
                    Toutes les classes
                </button>
                {classes.map(cls => (
                    <button
                        key={cls.id}
                        className={`tw-class-chip ${selectedClass === cls.name ? 'active' : ''}`}
                        onClick={() => setSelectedClass(cls.name)}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>

            {/* No data message */}
            {Object.keys(workloadData).length === 0 && (
                <div className="tw-empty">
                    <div className="tw-empty__icon">📭</div>
                    <h3>Aucune donnée de charge disponible</h3>
                    <p>Les données apparaîtront lorsque des élèves se connecteront et synchroniseront leurs devoirs.</p>
                </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && Object.keys(workloadData).length > 0 && (
                <div className="tw-calendar-container">
                    {/* Filter classes to show */}
                    {(selectedClass ? [selectedClass] : Object.keys(workloadData)).map(className => (
                        <div key={className} className="tw-class-calendar">
                            <h3 className="tw-class-calendar__title">{className}</h3>

                            {/* Week headers */}
                            <div className="tw-calendar-header">
                                <span>Lun</span>
                                <span>Mar</span>
                                <span>Mer</span>
                                <span>Jeu</span>
                                <span>Ven</span>
                                <span className="tw-weekend">Sam</span>
                                <span className="tw-weekend">Dim</span>
                            </div>

                            {/* Calendar grid */}
                            <div className="tw-calendar-grid">
                                {calendarDays.map((day, idx) => {
                                    const workload = getWorkloadForDate(className, day.date);
                                    const statusInfo = workload ? getLoadStatusInfo(workload.load_status) : null;

                                    return (
                                        <div
                                            key={idx}
                                            className={`tw-calendar-day 
                                                ${day.isToday ? 'tw-calendar-day--today' : ''}
                                                ${day.isWeekend ? 'tw-calendar-day--weekend' : ''}
                                                ${day.isSaturday ? 'tw-calendar-day--saturday' : ''}
                                                ${!day.isCurrentMonth ? 'tw-calendar-day--off-month' : ''}
                                                ${workload ? `tw-calendar-day--${workload.load_status}` : ''}
                                            `}
                                            onClick={() => workload && handleDateClick(className, day.date)}
                                        >
                                            <span className="tw-day-number">{day.dayOfMonth}</span>
                                            {workload && (
                                                <div className="tw-day-score">
                                                    <span className="tw-score-value">{workload.avg_score}</span>
                                                    <span className="tw-score-emoji">{statusInfo?.emoji}</span>
                                                </div>
                                            )}
                                            {workload && workload.total_tests > 0 && (
                                                <span className="tw-test-badge">📝 {workload.total_tests}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && Object.keys(workloadData).length > 0 && (
                <div className="tw-list-container">
                    {(selectedClass ? [selectedClass] : Object.keys(workloadData)).map(className => {
                        const classData = workloadData[className] || [];
                        const upcoming = classData.filter(d => d.score_date >= new Date().toISOString().split('T')[0]);

                        return (
                            <div key={className} className="tw-class-list">
                                <h3 className="tw-class-list__title">{className}</h3>

                                <div className="tw-list-items">
                                    {upcoming.slice(0, 14).map(day => {
                                        const statusInfo = getLoadStatusInfo(day.load_status);
                                        const dateObj = new Date(day.score_date);
                                        const isSaturday = dateObj.getDay() === 6;

                                        return (
                                            <div
                                                key={day.score_date}
                                                className={`tw-list-item tw-list-item--${day.load_status} ${isSaturday ? 'tw-list-item--saturday' : ''}`}
                                                onClick={() => handleDateClick(className, day.score_date)}
                                            >
                                                <div className="tw-list-item__date">
                                                    <span className="tw-list-item__day">
                                                        {dateObj.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                                    </span>
                                                    <span className="tw-list-item__num">
                                                        {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="tw-list-item__score">
                                                    <span className="tw-list-item__emoji">{statusInfo.emoji}</span>
                                                    <span className="tw-list-item__value">Score: {day.avg_score}</span>
                                                </div>
                                                <div className="tw-list-item__details">
                                                    <span>📚 {day.total_homework} devoirs</span>
                                                    <span>📝 {day.total_tests} évaluations</span>
                                                    <span>👥 {day.student_count} élèves</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedDate && (
                <div className="tw-modal-overlay" onClick={() => setSelectedDate(null)}>
                    <div className="tw-modal" onClick={e => e.stopPropagation()}>
                        <button className="tw-modal__close" onClick={() => setSelectedDate(null)}>×</button>

                        <div className="tw-modal__header">
                            <h2>{selectedDate.className}</h2>
                            <span className="tw-modal__date">
                                {new Date(selectedDate.date).toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </span>
                        </div>

                        <div className="tw-modal__content">
                            {dateDetails.length === 0 ? (
                                <p className="tw-modal__empty">Aucun détail disponible</p>
                            ) : (
                                <>
                                    <div className="tw-modal__summary">
                                        <div className="tw-summary-stat">
                                            <span className="tw-summary-stat__value">{dateDetails.length}</span>
                                            <span className="tw-summary-stat__label">élèves</span>
                                        </div>
                                        <div className="tw-summary-stat">
                                            <span className="tw-summary-stat__value">
                                                {Math.round(dateDetails.reduce((sum, d) => sum + d.total_score, 0) / dateDetails.length * 10) / 10}
                                            </span>
                                            <span className="tw-summary-stat__label">score moyen</span>
                                        </div>
                                    </div>

                                    <h4>Devoirs ce jour</h4>
                                    <div className="tw-assignments-list">
                                        {/* Aggregate all assignments from all students */}
                                        {(() => {
                                            const allAssignments = new Map();
                                            dateDetails.forEach(student => {
                                                (student.assignments || []).forEach(a => {
                                                    // Use subject + type as key to group similar assignments
                                                    const key = `${a.subject}-${a.type}-${a.content?.substring(0, 50) || a.title}`;
                                                    if (!allAssignments.has(key)) {
                                                        allAssignments.set(key, { ...a, count: 0 });
                                                    }
                                                    allAssignments.get(key).count++;
                                                });
                                            });

                                            return Array.from(allAssignments.values()).map((a, idx) => (
                                                <div key={idx} className={`tw-assignment-item tw-assignment-item--${a.type}`}>
                                                    <div className="tw-assignment-item__header">
                                                        <span className="tw-assignment-item__icon">
                                                            {a.type === 'test' ? '📝' : '📚'}
                                                        </span>
                                                        <span className="tw-assignment-item__subject">{a.subject}</span>
                                                        <span className="tw-assignment-item__type">
                                                            {a.type === 'test' ? 'Évaluation' : 'Devoir'}
                                                        </span>
                                                    </div>
                                                    {/* Render full HTML content */}
                                                    {(a.content || a.title) && (
                                                        <div
                                                            className="tw-assignment-item__content"
                                                            dangerouslySetInnerHTML={{ __html: a.content || a.title }}
                                                        />
                                                    )}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
