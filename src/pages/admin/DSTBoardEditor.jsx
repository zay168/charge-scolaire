/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DST BOARD EDITOR - Éditeur de tableau interactif plein écran
 * Édition directe dans le tableau, fidèle au document officiel
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import StudentAutocomplete from '../../components/StudentAutocomplete';
import './DSTBoardEditor.css';

export default function DSTBoardEditor() {
    // Header Info
    const [dstDate, setDstDate] = useState('');
    const [subtitle, setSubtitle] = useState('2NDES A-B-D : PC (1H30) + SVT (1H30) / 2NDE C : PC (1H30)');

    // Main Table Rows (regular students)
    const [rows, setRows] = useState([
        { id: 1, classe: '2A', duree1: '9H00-10H30', duree2: '10H45-12H15', nbEleves: 32, profs: ['PC : Mme LEVY-CHEVASSON', 'SVT : M. PETIT'], salle: '41' },
        { id: 2, classe: '2B', duree1: '9H00-10H30', duree2: '10H45-12H15', nbEleves: 32, profs: ['PC : Mme PICARD', 'SVT : Mme JOUBERT'], salle: '42' },
        { id: 3, classe: '2C', duree1: '9H00-10H30', duree2: '', nbEleves: 31, profs: ['PC : MME LEVY-CHEVASSON', 'SVT : Mme FAÏD'], salle: '43' },
        { id: 4, classe: '2D', duree1: '9H00-10H30', duree2: '10H45-12H15', nbEleves: 32, profs: ['PC : Mme FAÏD', 'SVT : M. PETIT'], salle: '45' },
    ]);

    // Tiers-Temps Section
    const [tiersTempsTitle, setTiersTempsTitle] = useState('TIERS-TEMPS 2NDES (PC : 2H00-SVT : 2H00)');
    const [tiersTempsRows, setTiersTempsRows] = useState([
        { id: 1, eleve: '2C BERTRAND Stanislas', ordi: true },
        { id: 2, eleve: '2C GARCIA VERDUGO MESEGUER David', ordi: true },
        { id: 3, eleve: '2C SCHMITT Marine', ordi: false },
        { id: 4, eleve: '2C WISEMAN DANN Oscar', ordi: true },
    ]);

    // Tiers-Temps Group 2 (mixed classes)
    const [tiersTempsRows2, setTiersTempsRows2] = useState([
        { id: 1, eleve: '2A (SP) PASTOUR Raphaël', ordi: false },
        { id: 2, eleve: '2B MOREL Anouchka', ordi: false },
        { id: 3, eleve: '2B SUMAR Léonard', ordi: false },
        { id: 4, eleve: '2D BOUHAMIDI Jassem', ordi: true },
        { id: 5, eleve: '2D DE LA ROCHEBROCHARD Rose', ordi: false },
    ]);
    const [tiersTemps2Info, setTiersTemps2Info] = useState({
        duree: '08h40-10h40 / 10h50-12h50',
        nbEleves: 5,
        profs: ['PC : Mme LEVY-CHEVASSON / M. PETIT', 'PC : Mme PICARD / SVT : Mme JOUBERT', 'PC : Mme FAÏD / SVT : M. PETIT'],
        salle: '40'
    });

    // Format date for header
    const formatHeaderDate = () => {
        if (!dstDate) return 'DST SAMEDI __ ________ 20__';
        const d = new Date(dstDate);
        const days = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
        const months = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
        return `DST ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    // Update a row field
    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Update prof in row
    const updateProf = (rowId, profIndex, value) => {
        setRows(prev => prev.map(r => {
            if (r.id === rowId) {
                const newProfs = [...r.profs];
                newProfs[profIndex] = value;
                return { ...r, profs: newProfs };
            }
            return r;
        }));
    };

    // Add new row
    const addRow = () => {
        const newId = Math.max(...rows.map(r => r.id), 0) + 1;
        setRows([...rows, { id: newId, classe: '', duree1: '9H00-10H30', duree2: '10H45-12H15', nbEleves: 0, profs: ['', ''], salle: '' }]);
    };

    // Delete row
    const deleteRow = (id) => {
        setRows(rows.filter(r => r.id !== id));
    };

    // Add tiers-temps student
    const addTiersTemps = (group) => {
        if (group === 1) {
            const newId = Math.max(...tiersTempsRows.map(r => r.id), 0) + 1;
            setTiersTempsRows([...tiersTempsRows, { id: newId, eleve: '', ordi: false }]);
        } else {
            const newId = Math.max(...tiersTempsRows2.map(r => r.id), 0) + 1;
            setTiersTempsRows2([...tiersTempsRows2, { id: newId, eleve: '', ordi: false }]);
        }
    };

    // Update tiers-temps row
    const updateTiersTemps = (group, id, field, value) => {
        const setter = group === 1 ? setTiersTempsRows : setTiersTempsRows2;
        setter(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Delete tiers-temps
    const deleteTiersTemps = (group, id) => {
        if (group === 1) {
            setTiersTempsRows(tiersTempsRows.filter(r => r.id !== id));
        } else {
            setTiersTempsRows2(tiersTempsRows2.filter(r => r.id !== id));
        }
    };

    return (
        <div className="dst-board-editor">
            {/* DATE PICKER (floating) */}
            <div className="date-picker-float">
                <label>Date du DST :</label>
                <input type="date" value={dstDate} onChange={e => setDstDate(e.target.value)} />
            </div>

            {/* MAIN BOARD */}
            <div className="board-container">
                {/* HEADER */}
                <div className="board-title" contentEditable suppressContentEditableWarning>
                    {formatHeaderDate()}
                </div>

                <input
                    className="board-subtitle"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="2NDES A-B-D : PC (1H30) + SVT (1H30) / 2NDE C : PC"
                />

                {/* MAIN TABLE */}
                <table className="dst-table">
                    <thead>
                        <tr>
                            <th className="col-classe">CLASSE</th>
                            <th className="col-duree">DURÉE ÉPREUVE</th>
                            <th className="col-eleves">NBRE<br />ÉLÈVES</th>
                            <th className="col-profs">PROFESSEURS</th>
                            <th className="col-salle">SALLES</th>
                            <th className="col-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.id}>
                                <td className="cell-classe">
                                    <input value={row.classe} onChange={e => updateRow(row.id, 'classe', e.target.value)} placeholder="2A" />
                                </td>
                                <td className="cell-duree">
                                    <input value={row.duree1} onChange={e => updateRow(row.id, 'duree1', e.target.value)} placeholder="9H00-10H30" />
                                    <input value={row.duree2} onChange={e => updateRow(row.id, 'duree2', e.target.value)} placeholder="10H45-12H15" />
                                </td>
                                <td className="cell-eleves">
                                    <input type="number" value={row.nbEleves} onChange={e => updateRow(row.id, 'nbEleves', parseInt(e.target.value) || 0)} />
                                </td>
                                <td className="cell-profs">
                                    <input value={row.profs[0] || ''} onChange={e => updateProf(row.id, 0, e.target.value)} placeholder="PC : Mme ..." />
                                    <input value={row.profs[1] || ''} onChange={e => updateProf(row.id, 1, e.target.value)} placeholder="SVT : M. ..." />
                                </td>
                                <td className="cell-salle">
                                    <span className="salle-label">SALLE</span>
                                    <input value={row.salle} onChange={e => updateRow(row.id, 'salle', e.target.value)} placeholder="41" />
                                </td>
                                <td className="cell-actions">
                                    <button className="btn-delete" onClick={() => deleteRow(row.id)}>×</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button className="btn-add-row" onClick={addRow}>+ Ajouter une classe</button>

                {/* TIERS-TEMPS SECTION 1 */}
                <div className="tiers-section">
                    <input
                        className="tiers-title"
                        value={tiersTempsTitle}
                        onChange={e => setTiersTempsTitle(e.target.value)}
                    />

                    <table className="dst-table tiers-table">
                        <tbody>
                            {tiersTempsRows.map((row, idx) => (
                                <tr key={row.id} className="tiers-row">
                                    <td className="cell-eleve">
                                        {row.ordi && <span className="badge-ordi" onClick={() => updateTiersTemps(1, row.id, 'ordi', false)}>ORDI</span>}
                                        {!row.ordi && <span className="badge-ordi-off" onClick={() => updateTiersTemps(1, row.id, 'ordi', true)}>+ORDI</span>}
                                        <StudentAutocomplete
                                            value={row.eleve}
                                            onChange={(val) => updateTiersTemps(1, row.id, 'eleve', val)}
                                            placeholder="Tapez un nom..."
                                        />
                                    </td>
                                    {idx === 0 && (
                                        <>
                                            <td className="cell-duree-tt" rowSpan={tiersTempsRows.length}>
                                                08h40-10h40
                                            </td>
                                            <td className="cell-count-tt" rowSpan={tiersTempsRows.length}>
                                                {tiersTempsRows.length}
                                            </td>
                                            <td className="cell-prof-tt" rowSpan={tiersTempsRows.length}>
                                                PC : Mme LEVY-CHEVASSON
                                            </td>
                                        </>
                                    )}
                                    <td className="cell-delete">
                                        <button onClick={() => deleteTiersTemps(1, row.id)}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="btn-add-tiers" onClick={() => addTiersTemps(1)}>+ Élève tiers-temps</button>
                </div>

                {/* TIERS-TEMPS SECTION 2 (Mixed) */}
                <div className="tiers-section mixed">
                    <table className="dst-table tiers-table">
                        <tbody>
                            {tiersTempsRows2.map((row, idx) => (
                                <tr key={row.id} className="tiers-row-mixed">
                                    <td className="cell-eleve">
                                        {row.ordi && <span className="badge-ordi" onClick={() => updateTiersTemps(2, row.id, 'ordi', false)}>ORDI</span>}
                                        {!row.ordi && <span className="badge-ordi-off" onClick={() => updateTiersTemps(2, row.id, 'ordi', true)}>+ORDI</span>}
                                        <StudentAutocomplete
                                            value={row.eleve}
                                            onChange={(val) => updateTiersTemps(2, row.id, 'eleve', val)}
                                            placeholder="Tapez un nom..."
                                        />
                                    </td>
                                    {idx === 0 && (
                                        <>
                                            <td className="cell-duree-tt" rowSpan={tiersTempsRows2.length}>
                                                <input value={tiersTemps2Info.duree} onChange={e => setTiersTemps2Info({ ...tiersTemps2Info, duree: e.target.value })} />
                                            </td>
                                            <td className="cell-count-tt" rowSpan={tiersTempsRows2.length}>
                                                {tiersTempsRows2.length}
                                            </td>
                                            <td className="cell-prof-tt" rowSpan={tiersTempsRows2.length}>
                                                {tiersTemps2Info.profs.map((p, i) => (
                                                    <input key={i} value={p} onChange={e => {
                                                        const newProfs = [...tiersTemps2Info.profs];
                                                        newProfs[i] = e.target.value;
                                                        setTiersTemps2Info({ ...tiersTemps2Info, profs: newProfs });
                                                    }} />
                                                ))}
                                            </td>
                                            <td className="cell-salle-tt" rowSpan={tiersTempsRows2.length}>
                                                <span className="salle-label">SALLE</span>
                                                <input value={tiersTemps2Info.salle} onChange={e => setTiersTemps2Info({ ...tiersTemps2Info, salle: e.target.value })} />
                                            </td>
                                        </>
                                    )}
                                    <td className="cell-delete">
                                        <button onClick={() => deleteTiersTemps(2, row.id)}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="btn-add-tiers" onClick={() => addTiersTemps(2)}>+ Élève mixte tiers-temps</button>
                </div>
            </div>

            {/* SAVE / EXPORT */}
            <div className="board-actions">
                <button className="btn-export">📄 Exporter PDF</button>
                <button className="btn-save">💾 Sauvegarder</button>
            </div>
        </div>
    );
}
