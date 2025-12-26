
import React, { useState, useEffect, useCallback } from 'react';
// import { useOutletContext } from 'react-router-dom';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import './TeacherDashboard.css'; // Reuse dashboard styles for consistency

export function TeacherSchedule() {
    // const { teacher } = useOutletContext(); // Unused for now
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    // const [viewMode, setViewMode] = useState('week'); // Unused for now
    const [selectedEvent, setSelectedEvent] = useState(null);

    const loadSchedule = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate start/end of the week/month based on selectedDate
            const start = new Date(selectedDate);
            start.setDate(start.getDate() - start.getDay() + 1); // Monday

            const end = new Date(start);
            end.setDate(end.getDate() + 6); // Sunday

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            console.log(`fetching textbook slots from ${startStr} to ${endStr}`);
            // Use the new endpoint that returns everything (schedule + homework)
            const data = await realEcoleDirecteClient.getTeacherTextbookSlots(startStr, endStr);
            setSchedule(data);

            if (data.length > 0) {
                console.log('🔍 First slot sample:', data[0]);
            }

        } catch (error) {
            console.error("Error fetching schedule:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadSchedule();
    }, [loadSchedule]);

    const handleEventClick = (event) => {
        console.log('Clicked event:', event);
        setSelectedEvent(event);
    };

    // Group events by day
    const eventsByDay = schedule.reduce((acc, evt) => {
        const dateKey = evt.start.split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(evt);
        return acc;
    }, {});

    // Sort days
    const sortedDays = Object.keys(eventsByDay).sort();

    return (
        <div className="teacher-class-details"> {/* Reuse container style */}
            <header className="teacher-header">
                <div>
                    <h1 className="teacher-header__title">📅 Emploi du temps & Cahier de textes</h1>
                    <p className="teacher-header__subtitle">
                        Semaine du {new Date(selectedDate).toLocaleDateString('fr-FR')}
                    </p>
                </div>
                <div className="teacher-header__actions">
                    <button
                        className="teacher-btn teacher-btn--secondary"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 7);
                            setSelectedDate(newDate);
                        }}
                    >
                        ◀ Précédent
                    </button>
                    <button
                        className="teacher-btn teacher-btn--secondary"
                        onClick={() => setSelectedDate(new Date())}
                    >
                        Aujourd'hui
                    </button>
                    <button
                        className="teacher-btn teacher-btn--secondary"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 7);
                            setSelectedDate(newDate);
                        }}
                    >
                        Suivant ▶
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

                {/* Left: Schedule View */}
                <div className="teacher-card">
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
                    ) : schedule.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Aucun cours cette semaine</div>
                    ) : (
                        <div className="schedule-list">
                            {sortedDays.map(day => (
                                <div key={day} style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{
                                        borderBottom: '1px solid #e2e8f0',
                                        paddingBottom: '0.5rem',
                                        color: '#475569',
                                        marginBottom: '1rem',
                                        textTransform: 'capitalize'
                                    }}>
                                        {new Date(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {eventsByDay[day]
                                            .sort((a, b) => new Date(a.start) - new Date(b.start))
                                            .map(evt => (
                                                <div
                                                    key={evt.id}
                                                    onClick={() => handleEventClick(evt)}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        borderRadius: '8px',
                                                        background: selectedEvent?.id === evt.id ? '#f1f5f9' : 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderLeft: `5px solid ${evt.color || '#3b82f6'}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ minWidth: '80px', fontWeight: 'bold', color: '#64748b' }}>
                                                        {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        <br />
                                                        <span style={{ fontSize: '0.85em', fontWeight: 'normal' }}>
                                                            {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                                                            {evt.subject}
                                                        </div>
                                                        <div style={{ color: '#64748b' }}>
                                                            {evt.className} {evt.roomId && `• Salle ${evt.roomId}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Event Details / Homework */}
                <div className="teacher-card" style={{ height: 'fit-content' }}>
                    <h2 className="teacher-section__title">Détails de la séance</h2>
                    {selectedEvent ? (
                        <div>
                            <div style={{
                                background: selectedEvent.color || '#3b82f6',
                                color: 'white',
                                padding: '1rem',
                                borderRadius: '8px 8px 0 0',
                                marginBottom: '1rem'
                            }}>
                                <h3 style={{ margin: 0 }}>{selectedEvent.subject}</h3>
                                <div style={{ opacity: 0.9 }}>
                                    {selectedEvent.className} • {new Date(selectedEvent.start).toLocaleDateString()}
                                </div>
                            </div>

                            <div style={{ padding: '0 1rem 1rem' }}>
                                <p><strong>Horaire :</strong> {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p><strong>Salle :</strong> {selectedEvent.room || 'Non définie'}</p>

                                <hr style={{ margin: '1.5rem 0', borderColor: '#e2e8f0' }} />

                                <h4 style={{ marginBottom: '0.5rem' }}>📕 Cahier de textes</h4>

                                {selectedEvent.hasHomework ? (
                                    <div className="homework-content">
                                        <div style={{
                                            background: '#fef3c7',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            marginBottom: '1rem',
                                            color: '#d97706',
                                            fontWeight: '500'
                                        }}>
                                            ⚠️ Devoir à faire
                                        </div>

                                        {selectedEvent.homework?.content ? (
                                            <div
                                                className="homework-html-content"
                                                style={{ fontSize: '0.95rem', lineHeight: '1.6' }}
                                                dangerouslySetInnerHTML={{
                                                    __html: (() => {
                                                        try {
                                                            return decodeURIComponent(escape(window.atob(selectedEvent.homework.content)));
                                                        } catch {
                                                            return 'Erreur de décodage du contenu';
                                                        }
                                                    })()
                                                }}
                                            />
                                        ) : (
                                            <p style={{ fontStyle: 'italic', color: '#64748b' }}>Pas de description détaillée.</p>
                                        )}

                                        {selectedEvent.homework?.documents?.length > 0 && (
                                            <div style={{ marginTop: '1rem' }}>
                                                <strong>Documents joints :</strong>
                                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                                                    {selectedEvent.homework.documents.map(doc => (
                                                        <li key={doc.id} style={{ marginBottom: '0.25rem' }}>
                                                            <button
                                                                onClick={() => realEcoleDirecteClient.downloadAttachment(doc.id, doc.type, doc.name)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#2563eb',
                                                                    textDecoration: 'underline',
                                                                    cursor: 'pointer',
                                                                    padding: 0,
                                                                    fontSize: 'inherit',
                                                                    textAlign: 'left'
                                                                }}
                                                            >
                                                                📎 {doc.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                                        Aucun travail à faire enregistré pour cette séance.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="teacher-empty">
                            <p>Sélectionnez un cours pour voir les détails</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
