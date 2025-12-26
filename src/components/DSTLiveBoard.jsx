/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DST LIVE BOARD - Template de tableau de répartition des DST
 * Génère un tableau formaté comme le document officiel
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import './DSTLiveBoard.css';

export default function DSTLiveBoard({
    date,           // "2025-12-13"
    subject,        // "PC + SVT" 
    classes,        // ["2A", "2B", "2C", "2D"]
    classDetails,   // { "2A": { room: "41", professor: "Mme LEVY" }, ... }
    timeSlots,      // { start: "08:00", end: "12:00" } or per-class
    students,       // All students array
    selectedIds,    // Selected student IDs (for mixte)
    dispositifIds,  // Dispositif student IDs
    populationType  // "ENTIERE" or "MIXTE"
}) {

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'DATE NON DÉFINIE';
        const d = new Date(dateStr);
        const days = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
        const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
        return `DST ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Get students count per class
    const getStudentCount = (cls) => {
        if (populationType === 'MIXTE') {
            return students.filter(s => s.class_label === cls && selectedIds?.includes(s.id)).length;
        }
        return students.filter(s => s.class_label === cls).length;
    };

    // Get dispositif students
    const dispositifStudents = students.filter(s => dispositifIds?.includes(s.id));

    // Build subtitle (summary of classes + subjects)
    const buildSubtitle = () => {
        if (classes.length === 0) return 'Sélectionnez des classes';
        return `${classes.join(' - ')} : ${subject || 'MATIÈRE'}`;
    };

    // Generate time slots display (same for all classes for now)
    const getTimeDisplay = () => {
        return `${timeSlots?.start || '08:00'}-${timeSlots?.end || '12:00'}`;
    };

    return (
        <div className="live-board">
            {/* HEADER */}
            <div className="board-header">
                <h2>{formatDate(date)}</h2>
                <p className="board-subtitle">{buildSubtitle()}</p>
            </div>

            {/* MAIN TABLE */}
            <table className="board-table">
                <thead>
                    <tr>
                        <th>CLASSE</th>
                        <th>DURÉE ÉPREUVE</th>
                        <th>NBRE ÉLÈVES</th>
                        <th>PROFESSEURS</th>
                        <th>SALLES</th>
                    </tr>
                </thead>
                <tbody>
                    {classes.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="empty-row">Aucune classe sélectionnée</td>
                        </tr>
                    ) : (
                        classes.map(cls => (
                            <tr key={cls}>
                                <td className="cell-class">{cls}</td>
                                <td className="cell-time">{getTimeDisplay()}</td>
                                <td className="cell-count">{getStudentCount(cls) || '?'}</td>
                                <td className="cell-prof">{classDetails?.[cls]?.professor || '—'}</td>
                                <td className="cell-room">SALLE {classDetails?.[cls]?.room || '?'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* TIERS-TEMPS SECTION */}
            {dispositifStudents.length > 0 && (
                <div className="tiers-temps-section">
                    <div className="tiers-header">
                        <h3>TIERS-TEMPS {classes.join('-')}</h3>
                        <span className="tiers-info">(+20 min par épreuve)</span>
                    </div>
                    <table className="board-table tiers-table">
                        <thead>
                            <tr>
                                <th>ÉLÈVE</th>
                                <th>CLASSE</th>
                                <th>AMÉNAGEMENT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dispositifStudents.map(s => (
                                <tr key={s.id} className="tiers-row">
                                    <td className="cell-name">
                                        <span className="badge-ordi">ORDI</span>
                                        {s.last_name} {s.first_name}
                                    </td>
                                    <td>{s.class_label}</td>
                                    <td>Tiers-temps + Ordinateur</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MIXTE STUDENT LIST */}
            {populationType === 'MIXTE' && selectedIds?.length > 0 && (
                <div className="mixte-section">
                    <h3>ÉLÈVES SÉLECTIONNÉS ({selectedIds.length})</h3>
                    <div className="mixte-grid">
                        {students.filter(s => selectedIds.includes(s.id)).map(s => (
                            <div key={s.id} className={`mixte-cell ${dispositifIds?.includes(s.id) ? 'dispositif' : ''}`}>
                                <span className="mixte-class">{s.class_label}</span>
                                <span className="mixte-name">{s.last_name} {s.first_name?.[0]}.</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
