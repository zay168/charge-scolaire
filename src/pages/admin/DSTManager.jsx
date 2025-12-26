import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DSTLiveBoard from '../../components/DSTLiveBoard';
import './DSTManager.css';

export default function DSTManager() {
    const [dsts, setDsts] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        dst_date: '', start_time: '08:00', end_time: '12:00',
        subject: '', classes: [],
        population_type: 'ENTIERE', population_details: ''
    });

    // Per-class room & professor
    const [classDetails, setClassDetails] = useState({}); // { "2A": { room: "", professor: "" }, ... }

    // Student Selector State
    const [availableStudents, setAvailableStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [dispositifStudentIds, setDispositifStudentIds] = useState([]); // Élèves à dispositif
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const AVAILABLE_CLASSES = ['2A', '2B', '2C', '2D', '1A', '1B', '1C', 'TA', 'TB', 'TC'];

    useEffect(() => { loadDSTs(); }, []);

    const loadDSTs = async () => {
        const { data } = await supabase.from('dst_schedule').select('*').order('dst_date', { ascending: false }).limit(50);
        setDsts(data || []);
    };

    // Student Loading
    useEffect(() => {
        const load = async () => {
            if (formData.classes.length === 0) {
                setAvailableStudents([]);
                return;
            }
            setLoadingStudents(true);
            const { studentRepository } = await import('../../services/studentRepository');
            const s = await studentRepository.getStudentsByClasses(formData.classes);
            setAvailableStudents(s || []);
            setLoadingStudents(false);
        };
        load();
    }, [formData.classes]);

    const visibleStudents = availableStudents.filter(s =>
        `${s.last_name} ${s.first_name}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const handleClassToggle = (cls) => {
        setFormData(prev => {
            const isRemoving = prev.classes.includes(cls);
            if (!isRemoving && prev.population_type === 'MIXTE' && prev.classes.length >= 2) {
                alert('En mode mixte, maximum 2 classes par salle.');
                return prev;
            }

            // Update classDetails when adding/removing classes
            if (isRemoving) {
                const newDetails = { ...classDetails };
                delete newDetails[cls];
                setClassDetails(newDetails);
            } else {
                setClassDetails(prev => ({ ...prev, [cls]: { room: '', professor: '' } }));
            }

            return {
                ...prev,
                classes: isRemoving ? prev.classes.filter(c => c !== cls) : [...prev.classes, cls]
            };
        });
    };

    const updateClassDetail = (cls, field, value) => {
        setClassDetails(prev => ({
            ...prev,
            [cls]: { ...prev[cls], [field]: value }
        }));
    };

    const toggleStudent = (id) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleDispositif = (id, e) => {
        e.stopPropagation();
        setDispositifStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.classes.length === 0) { alert('Sélectionnez au moins une classe'); return; }

        try {
            const entries = formData.classes.map(cls => ({
                dst_date: formData.dst_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                class_name: cls,
                subject: formData.subject,
                professor: classDetails[cls]?.professor || null,
                room: classDetails[cls]?.room || null,
                population_type: formData.population_type,
                population_details: formData.population_details || null,
                selected_student_ids: formData.population_type === 'MIXTE'
                    ? selectedStudentIds.filter(id => availableStudents.find(s => s.id === id)?.class_label === cls)
                    : null,
                dispositif_student_ids: dispositifStudentIds.filter(id => availableStudents.find(s => s.id === id)?.class_label === cls),
                source: 'manual'
            }));

            const { error } = await supabase.from('dst_schedule').upsert(entries, { onConflict: 'dst_date,class_name,subject' });
            if (error) throw error;

            alert('✅ DST enregistré !');
            setShowForm(false);
            resetForm();
            loadDSTs();
        } catch (e) { alert('Erreur: ' + e.message); }
    };

    const resetForm = () => {
        setFormData({ dst_date: '', start_time: '08:00', end_time: '12:00', subject: '', classes: [], population_type: 'ENTIERE', population_details: '' });
        setClassDetails({});
        setSelectedStudentIds([]);
        setDispositifStudentIds([]);
    };

    const handleDelete = async (id) => {
        if (!confirm('Supprimer ?')) return;
        await supabase.from('dst_schedule').delete().eq('id', id);
        loadDSTs();
    };

    return (
        <div className="dst-manager">
            {/* HEADER */}
            <header className="dst-header">
                <div className="header-content">
                    <h1>📋 Gestion des DST</h1>
                    <p>Devoirs Surveillés du Samedi</p>
                </div>
                <button className="btn-create" onClick={() => setShowForm(true)}>
                    <span>+</span> Nouveau DST
                </button>
            </header>

            {/* FORM MODAL */}
            {showForm && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-container">
                        <button className="modal-close" onClick={() => setShowForm(false)}>×</button>

                        <div className="modal-layout">
                            {/* LEFT: Form */}
                            <div className="form-panel">
                                <h2>Création de DST</h2>

                                <form onSubmit={handleSubmit}>
                                    {/* Date */}
                                    <div className="form-section">
                                        <label className="form-label">📅 Date du DST</label>
                                        <input type="date" className="input-large" required value={formData.dst_date} onChange={e => setFormData({ ...formData, dst_date: e.target.value })} />
                                    </div>

                                    {/* Time */}
                                    <div className="form-section">
                                        <label className="form-label">⏰ Horaires</label>
                                        <div className="time-row">
                                            <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                                            <span className="time-separator">→</span>
                                            <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div className="form-section">
                                        <label className="form-label">📚 Matière</label>
                                        <input type="text" placeholder="Ex: Mathématiques" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                                    </div>

                                    {/* Classes */}
                                    <div className="form-section">
                                        <label className="form-label">🏫 Classes</label>
                                        <div className="class-grid">
                                            {AVAILABLE_CLASSES.map(c => (
                                                <button type="button" key={c} className={`class-btn ${formData.classes.includes(c) ? 'active' : ''}`} onClick={() => handleClassToggle(c)}>
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Room & Prof PER CLASS */}
                                    {formData.classes.length > 0 && (
                                        <div className="form-section">
                                            <label className="form-label">📍 Salles & Surveillants (par classe)</label>
                                            <div className="class-details-list">
                                                {formData.classes.map(cls => (
                                                    <div key={cls} className="class-detail-row">
                                                        <span className="class-label">{cls}</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Salle"
                                                            value={classDetails[cls]?.room || ''}
                                                            onChange={e => updateClassDetail(cls, 'room', e.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Surveillant"
                                                            value={classDetails[cls]?.professor || ''}
                                                            onChange={e => updateClassDetail(cls, 'professor', e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Population */}
                                    <div className="form-section">
                                        <label className="form-label">👥 Type de population</label>
                                        <div className="toggle-group">
                                            <button type="button" className={`toggle-btn ${formData.population_type === 'ENTIERE' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, population_type: 'ENTIERE' })}>
                                                Classe entière
                                            </button>
                                            <button type="button" className={`toggle-btn ${formData.population_type === 'MIXTE' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, population_type: 'MIXTE' })}>
                                                Mixte (2 classes max)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Student Selector */}
                                    {formData.population_type === 'MIXTE' && formData.classes.length > 0 && (
                                        <div className="form-section">
                                            <label className="form-label">🎯 Sélection des élèves</label>
                                            <input type="text" className="search-box" placeholder="Rechercher..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                                            <div className="student-scroll">
                                                {loadingStudents && <div className="loading-state">Chargement...</div>}
                                                {!loadingStudents && visibleStudents.length === 0 && <div className="empty-state-small">Aucun élève dans l'annuaire</div>}
                                                {visibleStudents.map(s => (
                                                    <div key={s.id} className={`student-item ${selectedStudentIds.includes(s.id) ? 'selected' : ''}`} onClick={() => toggleStudent(s.id)}>
                                                        <div className="student-info">
                                                            <span className="student-name">{s.last_name} {s.first_name}</span>
                                                            <span className="student-class">{s.class_label}</span>
                                                        </div>
                                                        <div className="student-actions">
                                                            <button type="button" className={`dispositif-btn ${dispositifStudentIds.includes(s.id) ? 'active' : ''}`} onClick={(e) => toggleDispositif(s.id, e)} title="Marquer comme élève à dispositif (PAP/tiers-temps)">
                                                                ♿
                                                            </button>
                                                            <span className="check-mark">{selectedStudentIds.includes(s.id) ? '✓' : ''}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-actions">
                                        <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
                                        <button type="submit" className="btn-submit">Enregistrer le DST</button>
                                    </div>
                                </form>
                            </div>

                            {/* RIGHT: Live Board Template */}
                            <div className="preview-panel">
                                <h3>📊 Tableau en temps réel</h3>
                                <DSTLiveBoard
                                    date={formData.dst_date}
                                    subject={formData.subject}
                                    classes={formData.classes}
                                    classDetails={classDetails}
                                    timeSlots={{ start: formData.start_time, end: formData.end_time }}
                                    students={availableStudents}
                                    selectedIds={selectedStudentIds}
                                    dispositifIds={dispositifStudentIds}
                                    populationType={formData.population_type}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DST LIST */}
            <div className="dst-list">
                {dsts.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Aucun DST enregistré</h3>
                        <p>Créez votre premier devoir surveillé</p>
                        <button className="btn-create" onClick={() => setShowForm(true)}>+ Créer un DST</button>
                    </div>
                )}

                <div className="dst-grid">
                    {dsts.map(dst => (
                        <div key={dst.id} className="dst-card">
                            <div className="card-date">
                                <span className="date-day">{new Date(dst.dst_date).getDate()}</span>
                                <span className="date-month">{new Date(dst.dst_date).toLocaleString('fr-FR', { month: 'short' })}</span>
                            </div>
                            <div className="card-content">
                                <h4>{dst.subject}</h4>
                                <div className="card-meta">
                                    <span className="meta-class">{dst.class_name}</span>
                                    <span className="meta-time">{dst.start_time?.slice(0, 5)} - {dst.end_time?.slice(0, 5)}</span>
                                </div>
                                {dst.room && <div className="card-room">📍 {dst.room}</div>}
                                {dst.population_type === 'MIXTE' && <div className="card-mixte">👥 Mixte</div>}
                            </div>
                            <button className="card-delete" onClick={() => handleDelete(dst.id)}>×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
