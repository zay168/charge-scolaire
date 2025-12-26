import React, { useState, useEffect } from 'react';
import { realEcoleDirecteClient } from '../../api/realEcoleDirecte';
import './StudentDetailModal.css';

export function StudentDetailModal({ student, onClose }) {
    const [activeTab, setActiveTab] = useState('overview'); // overview, notes, viescolaire, carnet
    const [vieScolaire, setVieScolaire] = useState(null);
    const [carnet, setCarnet] = useState(null);
    const [grades, setGrades] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

    useEffect(() => {
        if (student) {
            loadData();
        }
    }, [student]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vsData, carnetData, gradesData] = await Promise.all([
                realEcoleDirecteClient.getStudentVieScolaire(student.id),
                realEcoleDirecteClient.getStudentCarnet(student.id),
                realEcoleDirecteClient.getStudentGrades(student.id)
            ]);
            setVieScolaire(vsData);
            setCarnet(carnetData);
            setGrades(gradesData);
        } catch (e) {
            console.error("Error loading student details", e);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    // Calculs rapides pour le header
    const totalAbsences = vieScolaire?.absencesRetards?.filter(x => x.typeElement === 'Absence').length || 0;
    const totalRetards = vieScolaire?.absencesRetards?.filter(x => x.typeElement === 'Retard').length || 0;
    const totalSanctions = vieScolaire?.sanctionsEncouragements?.length || 0;

    // Get available periods (excluding annual)
    const availablePeriods = grades?.periodes?.filter(p => !p.annuel) || [];

    // Get selected period
    const currentPeriod = availablePeriods[selectedPeriodIdx] || availablePeriods[0];
    const moyenneGenerale = currentPeriod?.ensembleMatieres?.moyenneGenerale || '—';

    // Get disciplines (excluding groupe matieres for cleaner view)
    const disciplines = currentPeriod?.ensembleMatieres?.disciplines?.filter(
        d => !d.groupeMatiere && !d.sousMatiere && d.moyenne
    ) || [];

    // Filter individual notes by selected period
    const periodNotes = grades?.notes?.filter(
        note => note.codePeriode === currentPeriod?.idPeriode || note.codePeriode === currentPeriod?.codePeriode
    ) || [];

    return (
        <div className="sdm-overlay" onClick={onClose}>
            <div className="sdm-modal" onClick={e => e.stopPropagation()}>
                <button className="sdm-close" onClick={onClose}>&times;</button>

                {/* Header 360 */}
                <div className="sdm-header">
                    <div className="sdm-avatar-container">
                        {student.photo ? (
                            <img src={student.photo} alt={student.firstName} className="sdm-avatar-img" />
                        ) : (
                            <div className="sdm-avatar-placeholder">
                                {student.firstName[0]}{student.lastName[0]}
                            </div>
                        )}
                    </div>
                    <div className="sdm-identity">
                        <h2 className="sdm-name">{student.firstName} {student.lastName}</h2>
                        <div className="sdm-class-badge">{student.className || 'Classe inconnu'}</div>
                        <div className="sdm-stats-row">
                            <div className="sdm-stat">
                                <span className="sdm-stat-val text-blue">{moyenneGenerale}</span>
                                <span className="sdm-stat-label">Moyenne</span>
                            </div>
                            <div className="sdm-stat">
                                <span className="sdm-stat-val text-red">{totalAbsences}</span>
                                <span className="sdm-stat-label">Absences</span>
                            </div>
                            <div className="sdm-stat">
                                <span className="sdm-stat-val text-orange">{totalRetards}</span>
                                <span className="sdm-stat-label">Retards</span>
                            </div>
                            <div className="sdm-stat">
                                <span className="sdm-stat-val text-purple">{totalSanctions}</span>
                                <span className="sdm-stat-label">Sanctions</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="sdm-tabs">
                    <button
                        className={`sdm-tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Vue d'ensemble
                    </button>
                    <button
                        className={`sdm-tab ${activeTab === 'notes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        📊 Notes
                    </button>
                    <button
                        className={`sdm-tab ${activeTab === 'viescolaire' ? 'active' : ''}`}
                        onClick={() => setActiveTab('viescolaire')}
                    >
                        Vie Scolaire
                    </button>
                    <button
                        className={`sdm-tab ${activeTab === 'carnet' ? 'active' : ''}`}
                        onClick={() => setActiveTab('carnet')}
                    >
                        Carnet
                    </button>
                </div>

                {/* Content */}
                <div className="sdm-content">
                    {loading ? (
                        <div className="sdm-loading">Chargement des données...</div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="sdm-panel-overview">
                                    {/* Quick Grade Overview */}
                                    <div className="sdm-card sdm-card--highlight">
                                        <h3>📊 Résumé des Notes</h3>
                                        <div className="sdm-grade-summary">
                                            <div className="sdm-grade-big">
                                                <span className="sdm-grade-value">{moyenneGenerale}</span>
                                                <span className="sdm-grade-label">Moyenne Générale</span>
                                            </div>
                                            {currentPeriod?.ensembleMatieres?.moyenneClasse && (
                                                <div className="sdm-grade-small">
                                                    <span>Classe: {currentPeriod.ensembleMatieres.moyenneClasse}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sdm-card">
                                        <h3>📢 Derniers événements</h3>
                                        {vieScolaire?.absencesRetards?.slice(0, 3).map(evt => (
                                            <div key={evt.id} className="sdm-event-item">
                                                <div className={`sdm-event-icon ${evt.typeElement.toLowerCase()}`}>
                                                    {evt.typeElement === 'Absence' ? '🚫' : '⏰'}
                                                </div>
                                                <div className="sdm-event-info">
                                                    <div className="sdm-event-title">{evt.typeElement} - {evt.motif || 'Aucun motif'}</div>
                                                    <div className="sdm-event-date">{evt.displayDate}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!vieScolaire?.absencesRetards || vieScolaire.absencesRetards.length === 0) && (
                                            <div className="sdm-empty">Aucun événement récent</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="sdm-panel-notes">
                                    {/* Period selector tabs */}
                                    {availablePeriods.length > 1 && (
                                        <div className="sdm-period-tabs">
                                            {availablePeriods.map((period, idx) => (
                                                <button
                                                    key={period.idPeriode || idx}
                                                    className={`sdm-period-tab ${selectedPeriodIdx === idx ? 'active' : ''}`}
                                                    onClick={() => setSelectedPeriodIdx(idx)}
                                                >
                                                    {period.periode}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Period header */}
                                    <div className="sdm-period-header">
                                        <h3>{currentPeriod?.periode || 'Période en cours'}</h3>
                                        <div className="sdm-period-avg">
                                            Moyenne générale: <strong>{moyenneGenerale}</strong>
                                        </div>
                                    </div>

                                    {/* Subject grades */}
                                    <div className="sdm-subjects-list">
                                        {disciplines.map(disc => {
                                            const avg = parseFloat((disc.moyenne || '0').replace(',', '.'));
                                            const classAvg = parseFloat((disc.moyenneClasse || '0').replace(',', '.'));
                                            const diff = avg - classAvg;

                                            return (
                                                <div key={disc.id} className="sdm-subject-row">
                                                    <div className="sdm-subject-info">
                                                        <span className="sdm-subject-name">{disc.discipline}</span>
                                                        {disc.professeurs?.length > 0 && (
                                                            <span className="sdm-subject-teacher">
                                                                {disc.professeurs.map(p => p.nom).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="sdm-subject-grades">
                                                        <span className={`sdm-subject-avg ${avg >= 14 ? 'good' : avg >= 10 ? 'ok' : 'low'}`}>
                                                            {disc.moyenne}
                                                        </span>
                                                        <span className="sdm-subject-class-avg">
                                                            Classe: {disc.moyenneClasse}
                                                        </span>
                                                        {diff !== 0 && !isNaN(diff) && (
                                                            <span className={`sdm-subject-diff ${diff > 0 ? 'positive' : 'negative'}`}>
                                                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {disciplines.length === 0 && (
                                            <div className="sdm-empty">Aucune note disponible</div>
                                        )}
                                    </div>

                                    {/* Recent individual grades for this period */}
                                    {periodNotes.length > 0 && (
                                        <div className="sdm-recent-grades">
                                            <h4>Notes du {currentPeriod?.periode || 'trimestre'}</h4>
                                            {periodNotes.slice(0, 8).map(note => (
                                                <div key={note.id} className="sdm-grade-item">
                                                    <div className="sdm-grade-item-info">
                                                        <span className="sdm-grade-item-subject">{note.libelleMatiere}</span>
                                                        <span className="sdm-grade-item-title">{note.devoir}</span>
                                                    </div>
                                                    <div className="sdm-grade-item-value">
                                                        <span className={`sdm-grade-note ${parseFloat((note.valeur || '0').replace(',', '.')) >= 10 ? 'good' : 'low'}`}>
                                                            {note.valeur}/{note.noteSur}
                                                        </span>
                                                        <span className="sdm-grade-item-date">
                                                            {new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {periodNotes.length > 8 && (
                                                <div className="sdm-more-notes">
                                                    + {periodNotes.length - 8} autres notes
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {periodNotes.length === 0 && disciplines.length > 0 && (
                                        <div className="sdm-empty" style={{ marginTop: '1rem' }}>
                                            Aucune note individuelle pour cette période
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'viescolaire' && (
                                <div className="sdm-panel-list">
                                    <h3>Absences & Retards</h3>
                                    <div className="sdm-timeline">
                                        {vieScolaire?.absencesRetards?.map(evt => (
                                            <div key={evt.id} className="sdm-timeline-item">
                                                <div className="sdm-date-badge">
                                                    {new Date(evt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                </div>
                                                <div className="sdm-timeline-content">
                                                    <div style={{ fontWeight: 600, color: evt.typeElement === 'Absence' ? '#ef4444' : '#f97316' }}>
                                                        {evt.typeElement}
                                                    </div>
                                                    <div className="sdm-text-sm">{evt.displayDate}</div>
                                                    {evt.motif && <div className="sdm-motif">Motif: {evt.motif}</div>}
                                                    {evt.commentaire && <div className="sdm-comment">"{evt.commentaire}"</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {vieScolaire?.sanctionsEncouragements?.length > 0 && (
                                        <>
                                            <h3>Sanctions & Encouragements</h3>
                                            <div className="sdm-timeline">
                                                {vieScolaire.sanctionsEncouragements.map(sanction => (
                                                    <div key={sanction.id} className="sdm-timeline-item sanction">
                                                        <div className="sdm-date-badge">
                                                            {sanction.date ? new Date(sanction.date).toLocaleDateString() : '???'}
                                                        </div>
                                                        <div className="sdm-timeline-content">
                                                            <div style={{ fontWeight: 600, color: '#a855f7' }}>
                                                                {sanction.libelle} ({sanction.typeElement})
                                                            </div>
                                                            <div className="sdm-motif">{sanction.motif}</div>
                                                            <div className="sdm-text-sm text-gray">Par: {sanction.par}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'carnet' && (
                                <div className="sdm-panel-list">
                                    <h3>Carnet de Correspondance</h3>
                                    {carnet?.correspondances?.map((note, idx) => (
                                        <div key={idx} className="sdm-note-card">
                                            <div className="sdm-note-header">
                                                <span className="sdm-note-type">{note.type}</span>
                                                <span className="sdm-note-date">{new Date(note.dateCreation).toLocaleDateString()}</span>
                                            </div>
                                            <div className="sdm-note-content">
                                                {note.contenu}
                                            </div>
                                            <div className="sdm-note-footer">
                                                Par: {note.auteur?.prenom} {note.auteur?.nom}
                                                {note.signature?.dateValidation && <span className="sdm-signed-badge">✅ Signé par {note.signature.nom}</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!carnet?.correspondances || carnet.correspondances.length === 0) && (
                                        <div className="sdm-empty">Aucune note dans le carnet</div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
