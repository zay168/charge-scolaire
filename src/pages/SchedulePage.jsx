/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCHEDULE PAGE
 * Visual timetable grid with colored time slots - Premium Design
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import ecoleDirecteClient from '../api/ecoleDirecte';
import './SchedulePage.css';

// Time slots for the timetable (8h to 20h)
const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

// Color mapping for subjects -> CSS class
const SUBJECT_COLOR_CLASSES = {
    'MATHS': 'blue',
    'MATHEMATIQUES': 'blue',
    'FRANCAIS': 'pink',
    'FRANÇAIS': 'pink',
    'ANGLAIS': 'pink',
    'LV1': 'pink',
    'ITALIEN': 'yellow',
    'ESPAGNOL': 'orange',
    'LV2': 'orange',
    'LV3': 'orange',
    'ALLEMAND': 'yellow',
    'ARABE': 'orange',
    'HISTOIRE': 'green',
    'HISTOIRE-GEO': 'green',
    'HG': 'green',
    'GEOGRAPHIE': 'green',
    'SVT': 'green',
    'SCIENCES VIE': 'green',
    'PHYSIQUE': 'cyan',
    'PHYSIQUE-CHIMIE': 'cyan',
    'PC': 'cyan',
    'CHIMIE': 'cyan',
    'EPS': 'red',
    'ED.PHYSIQUE': 'red',
    'SPORT': 'red',
    'TECHNOLOGIE': 'purple',
    'TECHNO': 'purple',
    'ARTS': 'purple',
    'ARTS PLASTIQUES': 'purple',
    'MUSIQUE': 'purple',
    'PHILOSOPHIE': 'gray',
    'PHILO': 'gray',
    'SES': 'yellow',
    'SC. ECONO': 'yellow',
    'NSI': 'teal',
    'SNT': 'teal',
    'SC.NUMERIQ': 'teal',
    'EMC': 'orange',
    'HUMANITES': 'purple',
    'LCA': 'yellow',
    'LATIN': 'yellow',
    'SECTION EURO': 'orange',
};

// Get color class for a subject
const getSubjectColorClass = (subject) => {
    if (!subject) return 'gray';
    const upperSubject = subject.toUpperCase();

    for (const [key, colorClass] of Object.entries(SUBJECT_COLOR_CLASSES)) {
        if (upperSubject.includes(key)) {
            return colorClass;
        }
    }
    return 'gray';
};

// Convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const date = new Date(timeStr);
    return date.getHours() * 60 + date.getMinutes();
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
        // Default to current day of week (0=Monday, 5=Saturday)
        const today = new Date().getDay();
        return today === 0 ? 0 : Math.min(today - 1, 5); // Sunday = 0 -> Monday
    });
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    });

    // Break popup state
    const [breakPopup, setBreakPopup] = useState(null);

    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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
            const dateStr = date.toISOString().split('T')[0];
            grouped[dateStr] = [];
        });

        schedule.forEach(entry => {
            const dateStr = entry.start?.split(' ')[0] || entry.start?.split('T')[0];
            if (grouped[dateStr]) {
                const startMinutes = timeToMinutes(entry.start);
                const endMinutes = timeToMinutes(entry.end);

                // Calculate position in pixels (1 hour = 60px, so 1 minute = 1px)
                const gridStartMinutes = 8 * 60; // 8:00

                // Position in pixels: minutes since 8:00
                const topPx = startMinutes - gridStartMinutes;
                const heightPx = endMinutes - startMinutes;

                grouped[dateStr].push({
                    ...entry,
                    startMinutes,
                    endMinutes,
                    topPx: Math.max(0, topPx),
                    heightPx: Math.max(30, heightPx), // Minimum 30px height
                    startTime: entry.start ? new Date(entry.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
                    endTime: entry.end ? new Date(entry.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
                    colorClass: getSubjectColorClass(entry.subject),
                });
            }
        });

        // Detect overlapping courses and assign columns
        let groupIdCounter = 0;
        Object.keys(grouped).forEach(dateStr => {
            const entries = grouped[dateStr];
            if (entries.length === 0) return;

            // Sort by start time, then by subject for consistency
            entries.sort((a, b) => {
                if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
                return (a.subject || '').localeCompare(b.subject || '');
            });

            // Initialize all entries
            entries.forEach(entry => {
                entry.column = 0;
                entry.totalColumns = 1;
                entry.groupId = null;
            });

            // Find groups of overlapping courses
            const processed = new Set();

            for (let i = 0; i < entries.length; i++) {
                if (processed.has(i)) continue;

                const current = entries[i];
                const group = [{ index: i, entry: current }];
                processed.add(i);

                // Find all entries that overlap with any entry in the group
                for (let j = i + 1; j < entries.length; j++) {
                    if (processed.has(j)) continue;

                    const other = entries[j];

                    // Check if other overlaps with any entry in the group
                    const overlaps = group.some(({ entry: groupEntry }) =>
                        groupEntry.startMinutes < other.endMinutes &&
                        groupEntry.endMinutes > other.startMinutes
                    );

                    if (overlaps) {
                        group.push({ index: j, entry: other });
                        processed.add(j);
                    }
                }

                // If group has multiple entries, assign columns and groupId
                if (group.length > 1) {
                    const currentGroupId = groupIdCounter++;
                    group.forEach(({ entry }, idx) => {
                        entry.column = idx;
                        entry.totalColumns = group.length;
                        entry.groupId = currentGroupId;
                    });
                }
            }
        });

        return grouped;
    }, [schedule, weekDates]);

    // Navigate weeks
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

    // Handle click on day body to show break duration
    const handleDayBodyClick = (e, daySchedule) => {
        // Ignore if clicking on a course entry
        if (e.target.closest('.timetable__entry')) {
            setBreakPopup(null);
            return;
        }

        // Get click position relative to day-body
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const clickMinutes = Math.floor(clickY) + 8 * 60; // Convert px to minutes since midnight

        // Sort courses by start time
        const sortedCourses = [...daySchedule].sort((a, b) => a.topPx - b.topPx);

        if (sortedCourses.length === 0) {
            setBreakPopup(null);
            return;
        }

        // Find the first course start and last course end
        const firstCourseStart = sortedCourses[0].topPx + 8 * 60;
        const lastCourseEnd = sortedCourses[sortedCourses.length - 1].topPx + sortedCourses[sortedCourses.length - 1].heightPx + 8 * 60;

        // Don't show popup if clicking before first course or after last course
        if (clickMinutes < firstCourseStart || clickMinutes > lastCourseEnd) {
            setBreakPopup(null);
            return;
        }

        // Find which gap we clicked in
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

    // Close popup when clicking elsewhere
    const closeBreakPopup = () => setBreakPopup(null);

    if (isLoading) {
        return (
            <div className="schedule-page">
                <div className="schedule-page__loading">
                    <div className="spinner" />
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
        <div className="schedule-page">
            {/* Header */}
            <header className="schedule-page__header">
                <h1 className="schedule-page__title">📅 Emploi du temps</h1>

                <div className="schedule-page__navigation">
                    <button
                        className="nav-btn"
                        onClick={goToPreviousWeek}
                        aria-label="Semaine précédente"
                    >
                        ←
                    </button>
                    <span className="schedule-page__week-label">
                        {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – {' '}
                        {weekDates[weekDates.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                        className="nav-btn"
                        onClick={goToNextWeek}
                        aria-label="Semaine suivante"
                    >
                        →
                    </button>
                    <button
                        className="nav-btn nav-btn--today"
                        onClick={goToCurrentWeek}
                    >
                        Aujourd'hui
                    </button>
                </div>
            </header>

            {/* Mobile Day Selector */}
            <div className="mobile-day-selector">
                {weekDates.map((date, idx) => {
                    const isToday = new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0];
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

            {/* Timetable Grid */}
            <div className="timetable">
                {/* Time column */}
                <div className="timetable__times">
                    <div className="timetable__corner"></div>
                    {TIME_SLOTS.map(time => (
                        <div key={time} className="timetable__time-slot">
                            {time}
                        </div>
                    ))}
                </div>

                {/* Days columns */}
                <div className="timetable__grid">
                    {weekDates.map((date, dayIndex) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const daySchedule = scheduleByDay[dateStr] || [];
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isSelected = dayIndex === selectedDayIndex;

                        return (
                            <div
                                key={dateStr}
                                className={`timetable__day ${isToday ? 'timetable__day--today' : ''} ${isSelected ? 'timetable__day--selected' : ''}`}
                            >
                                {/* Day header */}
                                <div className="timetable__day-header">
                                    <span className="timetable__day-name">{dayNames[dayIndex]}</span>
                                    <span className="timetable__day-date">
                                        {date.getDate()}
                                    </span>
                                </div>

                                {/* Time slots background - clickable for break detection */}
                                <div
                                    className="timetable__day-body"
                                    onClick={(e) => handleDayBodyClick(e, daySchedule)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {TIME_SLOTS.map((_, idx) => (
                                        <div key={idx} className="timetable__hour-line" />
                                    ))}

                                    {/* Course entries - grouped for overlapping courses */}
                                    {(() => {
                                        // Group entries: overlapping ones together, single ones alone
                                        const groups = [];
                                        let currentGroup = [];
                                        let currentGroupId = null;

                                        daySchedule.forEach((entry, idx) => {
                                            if (entry.groupId !== null) {
                                                // Part of an overlap group
                                                if (currentGroupId !== entry.groupId) {
                                                    // Finish previous group if any
                                                    if (currentGroup.length > 0) {
                                                        groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });
                                                    }
                                                    currentGroup = [];
                                                    currentGroupId = entry.groupId;
                                                }
                                                currentGroup.push({ entry, idx });
                                            } else {
                                                // Not overlapping
                                                if (currentGroup.length > 0) {
                                                    groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });
                                                    currentGroup = [];
                                                    currentGroupId = null;
                                                }
                                                groups.push({ type: 'single', entries: [{ entry, idx }] });
                                            }
                                        });

                                        // Don't forget last group
                                        if (currentGroup.length > 0) {
                                            groups.push({ type: currentGroupId !== null ? 'overlap' : 'single', entries: currentGroup });
                                        }

                                        return groups.map((group, groupIdx) => {
                                            if (group.type === 'overlap') {
                                                // Calculate group boundaries for desktop
                                                const minTop = Math.min(...group.entries.map(({ entry }) => entry.topPx));
                                                const maxBottom = Math.max(...group.entries.map(({ entry }) => entry.topPx + entry.heightPx));

                                                // Wrap overlapping entries in a flex container
                                                return (
                                                    <div
                                                        key={`group-${groupIdx}`}
                                                        className="timetable__overlap-group"
                                                        style={{
                                                            top: `${minTop}px`,
                                                            height: `${maxBottom - minTop}px`,
                                                        }}
                                                    >
                                                        {group.entries.map(({ entry, idx }) => {
                                                            const widthPercent = 100 / entry.totalColumns;
                                                            const leftPercent = entry.column * widthPercent;
                                                            // Top is relative to the group
                                                            const relativeTop = entry.topPx - minTop;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`timetable__entry entry-color-${entry.colorClass} ${entry.canceled ? 'timetable__entry--canceled' : ''}`}
                                                                    style={{
                                                                        top: `${relativeTop}px`,
                                                                        height: `${entry.heightPx}px`,
                                                                        left: `calc(${leftPercent}% + 4px)`,
                                                                        width: `calc(${widthPercent}% - 8px)`,
                                                                        right: 'auto',
                                                                    }}
                                                                    title={`${entry.subject}\n${entry.startTime} - ${entry.endTime}\n${entry.room || ''}\n${entry.teacher || ''}`}
                                                                >
                                                                    <div className="timetable__entry-content">
                                                                        <span className="timetable__entry-time-room">
                                                                            {entry.startTime} - {entry.endTime}{entry.room ? ` En ${entry.room}` : ''}
                                                                        </span>
                                                                        <span className="timetable__entry-subject">
                                                                            {entry.subject}
                                                                        </span>
                                                                        {entry.teacher && (
                                                                            <span className="timetable__entry-teacher">
                                                                                {entry.teacher}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            } else {
                                                // Single entry, no wrapper needed
                                                const { entry, idx } = group.entries[0];
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`timetable__entry entry-color-${entry.colorClass} ${entry.canceled ? 'timetable__entry--canceled' : ''}`}
                                                        style={{
                                                            top: `${entry.topPx}px`,
                                                            height: `${entry.heightPx}px`,
                                                        }}
                                                        title={`${entry.subject}\n${entry.startTime} - ${entry.endTime}\n${entry.room || ''}\n${entry.teacher || ''}`}
                                                    >
                                                        <div className="timetable__entry-content">
                                                            <span className="timetable__entry-time-room">
                                                                {entry.startTime} - {entry.endTime}{entry.room ? ` En ${entry.room}` : ''}
                                                            </span>
                                                            <span className="timetable__entry-subject">
                                                                {entry.subject}
                                                            </span>
                                                            {entry.teacher && (
                                                                <span className="timetable__entry-teacher">
                                                                    {entry.teacher}
                                                                </span>
                                                            )}
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

            {/* Break duration popup */}
            {breakPopup && (
                <div
                    className="break-popup-overlay"
                    onClick={closeBreakPopup}
                >
                    <div
                        className="break-popup"
                        style={{
                            left: breakPopup.x,
                            top: breakPopup.y,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="break-popup__icon">☕</div>
                        <div className="break-popup__duration">{breakPopup.duration}</div>
                        <div className="break-popup__times">
                            {breakPopup.from} → {breakPopup.to}
                        </div>
                        <div className="break-popup__label">Pause</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SchedulePage;
