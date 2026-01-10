/**
 * @typedef {Object} EDScheduleEntry
 * @property {number} id - Ex: 333162
 * @property {string} text - Ex: "ANGLAIS LV1"
 * @property {string} matiere - Ex: "ANGLAIS LV1"
 * @property {string} codeMatiere - Ex: "AGL1"
 * @property {string} typeCours - Ex: "COURS"
 * @property {string} start_date - Ex: "2026-01-05 12:50" (YYYY-MM-DD HH:MM)
 * @property {string} end_date - Ex: "2026-01-05 13:35"
 * @property {string} color - Ex: "#fcf473"
 * @property {boolean} dispensable
 * @property {number} dispense
 * @property {string} prof - Ex: "WALLACE M."
 * @property {string} salle - Ex: "15"
 * @property {string} classe
 * @property {number} classeId
 * @property {string} classeCode
 * @property {number} evenementId
 * @property {string} groupe - Ex: "2B groupe A"
 * @property {string} groupeCode - Ex: "2B_GRA"
 * @property {boolean} isFlexible
 * @property {number} groupeId
 * @property {string} icone
 * @property {boolean} isModifie
 * @property {boolean} contenuDeSeance
 * @property {boolean} devoirAFaire
 * @property {boolean} isAnnule
 */

/**
 * @typedef {Object} ODHomeworkEntry
 * @property {string} matiere - Ex: "ITALIEN LV2"
 * @property {string} codeMatiere - Ex: "ITA2"
 * @property {boolean} aFaire
 * @property {number} idDevoir
 * @property {boolean} documentsAFaire
 * @property {string} donneLe - Ex: "2026-01-09"
 * @property {boolean} effectue
 * @property {boolean} interrogation
 * @property {boolean} rendreEnLigne
 * @property {Array} tags
 */

export const MOCK_SCHEDULE = [];

/**
 * Maps ED subject codes to our Neon theme palette
 * @param {string} codeMatiere 
 * @param {string} originalColor 
 * @returns {string} Hex color
 */
export const getNeonColorForSubject = (codeMatiere, originalColor) => {
    if (!codeMatiere) return originalColor || '#bd93f9'; // Default Purple

    const code = codeMatiere.toUpperCase();

    // 🎨 NEON PALETTE MAPPING
    if (code.includes('FRA') || code.includes('LIT') || code.includes('PHI')) return '#00f2ff'; // Cyan (Français/Philo)
    if (code.includes('MAT') || code.includes('SNT')) return '#ff0055'; // Red (Maths/Code)
    if (code.includes('AGL') || code.includes('ANG')) return '#ffea00'; // Yellow (Anglais)
    if (code.includes('HIS') || code.includes('GEO') || code.includes('SES')) return '#00ff9d'; // Green (Histoire/SES)
    if (code.includes('PHY') || code.includes('CHI') || code.includes('SVT')) return '#bd93f9'; // Purple (Sciences)
    if (code.includes('ESP') || code.includes('ALL') || code.includes('ITA')) return '#ff9100'; // Orange (LV2)
    if (code.includes('EPS') || code.includes('SPO')) return '#ff00ff'; // Magenta (Sport)

    // Fallback: If original color is too dark/pale, boost it, otherwise keep it
    return originalColor || '#ffffff';
};

/**
 * @typedef {Object} EDMessageSender
 * @property {number} id
 * @property {string} nom
 * @property {string} prenom
 * @property {string} civilite
 * @property {string} role
 */

/**
 * @typedef {Object} EDMessage
 * @property {number} id
 * @property {string} mtype - "received", "sent"
 * @property {boolean} read
 * @property {string} date - "YYYY-MM-DD HH:MM:SS"
 * @property {string} subject - Actually usually in "subject" or inferred
 * @property {string} content - Base64 encoded HTML
 * @property {EDMessageSender} from
 * @property {Array} to
 * @property {Array} files
 */

