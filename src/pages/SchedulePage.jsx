/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCHEDULE PAGE
 * Visual timetable grid with colored time slots - Premium Design
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';
import gsap from 'gsap';
import './SchedulePage.css';

// Time slots for the timetable (8h to 20h)
const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

import { getNeonColorForSubject } from '../api/ed-types';

// Convert time string to minutes since midnight
// Supports: "HH:MM", "YYYY-MM-DD HH:MM"
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    // 1. Extract purely the time part HH:MM
    const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;

    // 2. Parse HH:MM
    const match = timePart.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        return h * 60 + m;
    }

    return 0;
};

// Helper to convert hex to rgba with opacity
const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to format date as YYYY-MM-DD in local timezone (NOT UTC)
const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get week dates (Monday to Friday or Saturday)
const getWeekDates = (date, includeSaturday = true) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);

    const monday = new Date(current.setDate(diff));
    const dates = [];
    const daysCount = includeSaturday ? 6 : 5;

    for (let i = 0; i < daysCount; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }

    return dates;
};

export function SchedulePage() {
    const [schedule, setSchedule] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
        const today = new Date().getDay();
        return today === 0 ? 0 : Math.min(today - 1, 5);
    });
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    });

    const [breakPopup, setBreakPopup] = useState(null);
    const containerRef = useRef(null);

    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    // GSAP animation DISABLED - was clearing inline positioning styles
    // useLayoutEffect(() => {
    //     if (!isLoading && containerRef.current) {
    //         const ctx = gsap.context(() => {
    //             gsap.from('.timetable__entry', {
    //                 y: 20,
    //                 opacity: 0,
    //                 duration: 0.5,
    //                 stagger: 0.05,
    //                 ease: 'power2.out',
    //                 clearProps: 'all'
    //             });
    //         }, containerRef);
    //         return () => ctx.revert();
    //     }
    // }, [isLoading, schedule, selectedDayIndex]);

    // Fetch schedule
    useEffect(() => {
        async function fetchSchedule() {
            try {
                setIsLoading(true);
                const startDate = weekDates[0].toISOString().split('T')[0];
                const endDate = weekDates[weekDates.length - 1].toISOString().split('T')[0];
                const data = await ecoleDirecteClient.getSchedule(startDate, endDate);
                setSchedule(data || []);
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSchedule();
    }, [weekDates]);

    // Group schedule by day and calculate positions
    const scheduleByDay = useMemo(() => {
        const grouped = {};
        weekDates.forEach(date => {
            const dateStr = formatDateLocal(date); // Use local timezone
            grouped[dateStr] = [];
        });

        schedule.forEach(entry => {
            // Support both old API (start) and new interceptor (start_date) formats
            const rawStart = entry.start_date || entry.start;
            const rawEnd = entry.end_date || entry.end;
            const subject = entry.text || entry.matiere || entry.subject || 'Cours';
            const teacher = entry.prof || '';
            const room = entry.salle || '';
            const colorCode = entry.color || '';
            const matiereCode = entry.codeMatiere || '';

            if (!rawStart || !rawEnd) return;

            const dateStr = rawStart.includes(' ') ? rawStart.split(' ')[0] : rawStart.split('T')[0];

            if (grouped[dateStr]) {
                const startMinutes = timeToMinutes(rawStart);
                const endMinutes = timeToMinutes(rawEnd);
                const gridStartMinutes = 8 * 60; // 8:00

                // Skip courses before 8:00 or invalid duration
                if (startMinutes < gridStartMinutes || endMinutes <= startMinutes) return;

                const topPx = startMinutes - gridStartMinutes;
                const heightPx = endMinutes - startMinutes;

                // Determine Neo Color
                const neonColor = getNeonColorForSubject(matiereCode || subject, colorCode);

                grouped[dateStr].push({
                    ...entry,
                    subject,
                    teacher,
                    room,
                    startMinutes,
                    endMinutes,
                    topPx: Math.max(0, topPx),
                    heightPx: Math.max(30, heightPx),
                    startTime: rawStart.includes(' ') ? rawStart.split(' ')[1] : new Date(rawStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    endTime: rawEnd.includes(' ') ? rawEnd.split(' ')[1] : new Date(rawEnd).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    neonColor, // Direct hex color
                });
            }
        });

        // Detect overlapping courses using a column-packing algorithm
        Object.keys(grouped).forEach(dateStr => {
            const entries = grouped[dateStr];
            if (entries.length === 0) return;

            entries.sort((a, b) => {
                if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
                if (a.endMinutes !== b.endMinutes) return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
                return (a.subject || '').localeCompare(b.subject || '');
            });

            const clusters = [];
            let currentCluster = [];
            let clusterEnd = -1;

            entries.forEach(entry => {
                if (currentCluster.length === 0) {
                    currentCluster.push(entry);
                    clusterEnd = entry.endMinutes;
                } else {
                    if (entry.startMinutes < clusterEnd) {
                        currentCluster.push(entry);
                        clusterEnd = Math.max(clusterEnd, entry.endMinutes);
                    } else {
                        clusters.push(currentCluster);
                        currentCluster = [entry];
                        clusterEnd = entry.endMinutes;
                    }
                }
            });
            if (currentCluster.length > 0) clusters.push(currentCluster);

            let groupIdCounter = 0;
            clusters.forEach(cluster => {
                if (cluster.length === 1) {
                    cluster[0].column = 0;
                    cluster[0].totalColumns = 1;
                    cluster[0].groupId = null;
                    return;
                }

                const columns = [];
                const currentGroupId = groupIdCounter++;

                cluster.forEach(entry => {
                    entry.groupId = currentGroupId;
                    let placed = false;
                    for (let i = 0; i < columns.length; i++) {
                        const lastInCol = columns[i][columns[i].length - 1];
                        if (lastInCol.endMinutes <= entry.startMinutes) {
                            columns[i].push(entry);
                            entry.column = i;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        columns.push([entry]);
                        entry.column = columns.length - 1;
                    }
                });

                const totalCols = columns.length;
                cluster.forEach(entry => entry.totalColumns = totalCols);
            });
        });

        return grouped;
    }, [schedule, weekDates]);

    const goToPreviousWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const goToCurrentWeek = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        setCurrentWeekStart(new Date(today.setDate(diff)));
    };

    const handleDayBodyClick = (e, daySchedule) => {
        if (e.target.closest('.timetable__entry')) {
            setBreakPopup(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const clickMinutes = Math.floor(clickY) + 8 * 60;
        const sortedCourses = [...daySchedule].sort((a, b) => a.topPx - b.topPx);

        if (sortedCourses.length === 0) {
            setBreakPopup(null);
            return;
        }

        const firstCourseStart = sortedCourses[0].topPx + 8 * 60;
        const lastCourseEnd = sortedCourses[sortedCourses.length - 1].topPx + sortedCourses[sortedCourses.length - 1].heightPx + 8 * 60;

        if (clickMinutes < firstCourseStart || clickMinutes > lastCourseEnd) {
            setBreakPopup(null);
            return;
        }

        for (let i = 0; i < sortedCourses.length - 1; i++) {
            const currentEnd = sortedCourses[i].topPx + sortedCourses[i].heightPx + 8 * 60;
            const nextStart = sortedCourses[i + 1].topPx + 8 * 60;

            if (clickMinutes >= currentEnd && clickMinutes < nextStart) {
                const breakDuration = nextStart - currentEnd;
                if (breakDuration > 0) {
                    const hours = Math.floor(breakDuration / 60);
                    const mins = breakDuration % 60;
                    const durationText = hours > 0
                        ? `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`
                        : `${mins} min`;

                    setBreakPopup({
                        x: e.clientX,
                        y: e.clientY,
                        duration: durationText,
                        from: sortedCourses[i].endTime,
                        to: sortedCourses[i + 1].startTime,
                    });
                    return;
                }
            }
        }
        setBreakPopup(null);
    };

    const closeBreakPopup = () => setBreakPopup(null);

    if (isLoading) {
        return (
            <div className="schedule-page">
                <div className="schedule-page__loading">
                    <div className="schedule-page__spinner" />
                    <p>Chargement de l'emploi du temps...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="schedule-page">
                <div className="schedule-page__error">
                    <span>❌</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="schedule-page" ref={containerRef}>
            <header className="schedule-page__header">
                <h1 className="schedule-page__title">📅 Emploi du temps</h1>
                <div className="schedule-page__navigation">
                    <button className="nav-btn" onClick={goToPreviousWeek} aria-label="Semaine précédente">←</button>
                    <span className="schedule-page__week-label">
                        {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – {' '}
                        {weekDates[weekDates.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button className="nav-btn" onClick={goToNextWeek} aria-label="Semaine suivante">→</button>
                    <button className="nav-btn nav-btn--today" onClick={goToCurrentWeek}>Aujourd'hui</button>
                </div>
            </header>

            <div className="mobile-day-selector">
                {weekDates.map((date, idx) => {
                    const isToday = formatDateLocal(new Date()) === formatDateLocal(date);
                    return (
                        <button
                            key={idx}
                            className={`mobile-day-selector__btn ${selectedDayIndex === idx ? 'active' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setSelectedDayIndex(idx)}
                        >
                            <span className="mobile-day-selector__name">{dayNames[idx]}</span>
                            <span className="mobile-day-selector__date">{date.getDate()}</span>
                        </button>
                    );
                })}
            </div>

            <div className="timetable">
                <div className="timetable__times">
                    <div className="timetable__corner"></div>
                    {TIME_SLOTS.map(time => (
                        <div key={time} className="timetable__time-slot">{time}</div>
                    ))}
                </div>

                <div className="timetable__grid">
                    {weekDates.map((date, dayIndex) => {
                        const dateStr = formatDateLocal(date);
                        const daySchedule = scheduleByDay[dateStr] || [];
                        const isToday = formatDateLocal(new Date()) === dateStr;
                        const isSelected = dayIndex === selectedDayIndex;

                        return (
                            <div key={dateStr} className={`timetable__day ${isToday ? 'timetable__day--today' : ''} ${isSelected ? 'timetable__day--selected' : ''}`}>
                                <div className="timetable__day-header">
                                    <span className="timetable__day-name">{dayNames[dayIndex]}</span>
                                    <span className="timetable__day-date">{date.getDate()}</span>
                                </div>

                                <div className="timetable__day-body" onClick={(e) => handleDayBodyClick(e, daySchedule)} style={{ cursor: 'pointer' }}>
                                    {TIME_SLOTS.map((_, idx) => (
                                        <div key={idx} className="timetable__hour-line" />
                                    ))}

                                    {(() => {
                                        const groups = [];
                                        let currentGroup = [];
                                        let currentGroupId = null;

                                        daySchedule.forEach((entry, idx) => {
                                            if (entry.groupId !== null) {
                                                if (currentGroupId !== entry.groupId) {
                                                    if (currentGroup.length > 0) groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });
                                                    currentGroup = [];
                                                    currentGroupId = entry.groupId;
                                                }
                                                currentGroup.push({ entry, idx });
                                            } else {
                                                if (currentGroup.length > 0) {
                                                    groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });
                                                    currentGroup = [];
                                                    currentGroupId = null;
                                                }
                                                groups.push({ type: 'single', entries: [{ entry, idx }] });
                                            }
                                        });
                                        if (currentGroup.length > 0) groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });

                                        return groups.map((group, groupIdx) => {
                                            if (group.type === 'overlap') {
                                                const minTop = Math.min(...group.entries.map(({ entry }) => entry.topPx));
                                                const maxBottom = Math.max(...group.entries.map(({ entry }) => entry.topPx + entry.heightPx));
                                                const height = Math.max(0, maxBottom - minTop);

                                                return (
                                                    <div
                                                        key={`group-${groupIdx}`}
                                                        className="timetable__overlap-group"
                                                        style={{
                                                            position: 'absolute',
                                                            top: `${minTop}px`,
                                                            height: `${height}px`,
                                                            width: '100%',
                                                            left: 0,
                                                            zIndex: 10,
                                                            pointerEvents: 'none' // Let clicks pass through wrapper
                                                        }}
                                                    >
                                                        {group.entries.map(({ entry, idx }) => {
                                                            const widthPercent = 100 / entry.totalColumns;
                                                            const leftPercent = entry.column * widthPercent;
                                                            const relativeTop = entry.topPx - minTop;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`timetable__entry ${entry.isAnnule ? 'timetable__entry--canceled' : ''}`}
                                                                    style={{
                                                                        top: `${relativeTop}px`,
                                                                        height: `${entry.heightPx}px`,
                                                                        left: `calc(${leftPercent}% + 2px)`,
                                                                        width: `calc(${widthPercent}% - 4px)`,
                                                                        backgroundColor: hexToRgba(entry.neonColor, 0.15), // Glassy background
                                                                        pointerEvents: 'auto',
                                                                        borderLeft: `3px solid ${entry.neonColor}`,
                                                                        boxShadow: `0 0 10px ${hexToRgba(entry.neonColor, 0.1)}`
                                                                    }}
                                                                    title={`${entry.subject}\n${entry.startTime} - ${entry.endTime}`}
                                                                >
                                                                    <div className="timetable__entry-content">
                                                                        <span className="timetable__entry-time-room">
                                                                            {entry.startTime} - {entry.endTime}{entry.room ? ` En ${entry.room}` : ''}
                                                                        </span>
                                                                        <span className="timetable__entry-subject">{entry.subject}</span>
                                                                        {entry.teacher && <span className="timetable__entry-teacher">{entry.teacher}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            } else {
                                                const { entry, idx } = group.entries[0];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`timetable__entry ${entry.isAnnule ? 'timetable__entry--canceled' : ''}`}
                                                        style={{
                                                            top: `${entry.topPx}px`,
                                                            height: `${entry.heightPx}px`,
                                                            backgroundColor: hexToRgba(entry.neonColor, 0.15), // Glassy background
                                                            borderLeft: `3px solid ${entry.neonColor}`,
                                                            boxShadow: `0 0 10px ${hexToRgba(entry.neonColor, 0.1)}`
                                                        }}
                                                    >
                                                        <div className="timetable__entry-content">
                                                            <span className="timetable__entry-time-room">
                                                                {entry.startTime} - {entry.endTime}{entry.room ? ` En ${entry.room}` : ''}
                                                            </span>
                                                            <span className="timetable__entry-subject">{entry.subject}</span>
                                                            {entry.teacher && <span className="timetable__entry-teacher">{entry.teacher}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        });
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {breakPopup && (
                <div className="break-popup-overlay" onClick={closeBreakPopup}>
                    <div className="break-popup" style={{ left: breakPopup.x, top: breakPopup.y }} onClick={(e) => e.stopPropagation()}>
                        <div className="break-popup__icon">☕</div>
                        <div className="break-popup__duration">{breakPopup.duration}</div>
                        <div className="break-popup__times">{breakPopup.from} → {breakPopup.to}</div>
                        <div className="break-popup__label">Pause</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchedulePage;
