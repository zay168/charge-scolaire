/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SMART DST PARSER - Algorithme Intelligent Local (Zero Config)
 * Analyse les PDF de planning DST sans aucune API externe
 * ═══════════════════════════════════════════════════════════════════════════
 */

const MONTHS_FR = {
    'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
};

const KNOWN_SUBJECTS = [
    'MATHEMATIQUES', 'MATHS', 'MATH',
    'PHYSIQUE', 'CHIMIE', 'PC', 'PHYSIQUE-CHIMIE',
    'SVT', 'SCIENCES DE LA VIE',
    'FRANCAIS', 'FRANÇAIS', 'LETTRES',
    'HISTOIRE', 'GEOGRAPHIE', 'HG', 'HISTOIRE-GEO',
    'ANGLAIS', 'ESPAGNOL', 'ALLEMAND', 'LV1', 'LV2',
    'PHILOSOPHIE', 'PHILO',
    'SES', 'ECONOMIE',
    'NSI', 'INFORMATIQUE',
    'EPS', 'SPORT'
];

const CLASS_PATTERN = /\b([12T][A-Z])\b/gi;
const TIME_PATTERN = /\b(\d{1,2})[h:](\d{2})?\b/gi;
const DATE_PATTERNS = [
    // "14 JANVIER 2025" or "14 Janvier"
    /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s*(\d{4})?/gi,
    // "14/01/2025" or "14-01-25"
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    // "Samedi 14 Janvier"
    /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/gi
];

/**
 * Main parsing function
 * @param {string} rawText - Text extracted from PDF
 * @returns {Array} - Array of DST objects
 */
export function parseSmartDST(rawText) {
    console.log('🧠 Smart Parser: Analyzing text...');

    const results = [];
    const lines = rawText.split(/\n/).filter(l => l.trim());

    // 1. Find the main date of the document
    const mainDate = extractMainDate(rawText);
    console.log('📅 Detected main date:', mainDate);

    // 2. Find all classes mentioned
    const allClasses = extractClasses(rawText);
    console.log('🏫 Detected classes:', allClasses);

    // 3. Find all subjects mentioned
    const allSubjects = extractSubjects(rawText);
    console.log('📚 Detected subjects:', allSubjects);

    // 4. Find time slots
    const timeSlots = extractTimeSlots(rawText);
    console.log('⏰ Detected time slots:', timeSlots);

    // 5. Build DST entries by analyzing proximity/context
    // Strategy: For each unique (class, subject) pair, create an entry

    if (allClasses.length === 0) {
        console.warn('⚠️ No classes detected');
        return [];
    }

    // Simple heuristic: Each class + subject = 1 DST
    // More advanced: analyze line proximity

    const proximityMap = buildProximityMap(lines, allClasses, allSubjects);

    for (const [cls, subjects] of Object.entries(proximityMap)) {
        for (const subject of subjects) {
            results.push({
                id: Math.random().toString(36).substr(2, 9),
                dst_date: mainDate || new Date().toISOString().split('T')[0],
                start_time: timeSlots[0]?.start || '08:00',
                end_time: timeSlots[0]?.end || '12:00',
                class_name: cls.toUpperCase(),
                subject: subject,
                professor: '',
                room_details: extractRoomNear(rawText, cls, subject),
                population_type: 'ENTIERE',
                population_details: '',
                source: 'smart_import'
            });
        }
    }

    // Fallback: If proximity didn't work, create cross-product
    if (results.length === 0 && allClasses.length > 0 && allSubjects.length > 0) {
        console.log('⚙️ Using fallback cross-product strategy');
        for (const cls of allClasses) {
            for (const subject of allSubjects) {
                results.push({
                    id: Math.random().toString(36).substr(2, 9),
                    dst_date: mainDate || new Date().toISOString().split('T')[0],
                    start_time: '08:00',
                    end_time: '12:00',
                    class_name: cls.toUpperCase(),
                    subject: subject,
                    professor: '',
                    room_details: '',
                    population_type: 'ENTIERE',
                    source: 'smart_import'
                });
            }
        }
    }

    console.log(`✅ Smart Parser: Found ${results.length} DST entries`);
    return results;
}

// --- HELPER FUNCTIONS ---

function extractMainDate(text) {
    // Try text format first: "14 Janvier 2025" or "Samedi 14 Janvier"
    const textDatePattern = /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(\d{4}))?/i;
    const textMatch = text.match(textDatePattern);

    if (textMatch) {
        const day = textMatch[1].padStart(2, '0');
        const monthName = textMatch[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const month = MONTHS_FR[monthName] || '01';
        const year = textMatch[3] || new Date().getFullYear();
        return `${year}-${month}-${day}`;
    }

    // Try numeric format: "14/01/2025" or "14-01-25"
    const numericPattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const numMatch = text.match(numericPattern);

    if (numMatch) {
        const day = numMatch[1].padStart(2, '0');
        const month = numMatch[2].padStart(2, '0');
        let year = numMatch[3];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
    }

    // Default to today if no date found
    console.warn('⚠️ No date detected in PDF, using today');
    return new Date().toISOString().split('T')[0];
}

function extractClasses(text) {
    const matches = text.match(CLASS_PATTERN) || [];
    return [...new Set(matches.map(c => c.toUpperCase()))];
}

function extractSubjects(text) {
    const found = [];
    const upperText = text.toUpperCase();
    for (const subject of KNOWN_SUBJECTS) {
        if (upperText.includes(subject)) {
            // Normalize to canonical name
            let canonical = subject;
            if (['MATHS', 'MATH'].includes(subject)) canonical = 'MATHEMATIQUES';
            if (['PC', 'PHYSIQUE-CHIMIE'].includes(subject)) canonical = 'PHYSIQUE-CHIMIE';
            if (['HG', 'HISTOIRE-GEO'].includes(subject)) canonical = 'HISTOIRE-GEO';
            if (['PHILO'].includes(subject)) canonical = 'PHILOSOPHIE';

            if (!found.includes(canonical)) found.push(canonical);
        }
    }
    return found;
}

function extractTimeSlots(text) {
    const slots = [];
    const times = [];
    let match;
    const pattern = /\b(\d{1,2})[h:](\d{2})?\b/gi;

    while ((match = pattern.exec(text)) !== null) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2] || '00';
        times.push(`${hours}:${minutes}`);
    }

    // Pair consecutive times as start/end
    for (let i = 0; i < times.length - 1; i += 2) {
        slots.push({ start: times[i], end: times[i + 1] });
    }

    // Default slot if none found
    if (slots.length === 0) {
        slots.push({ start: '08:00', end: '12:00' });
    }

    return slots;
}

function buildProximityMap(lines, classes, subjects) {
    // Simple proximity: find which subjects appear near which classes
    const map = {};

    for (const line of lines) {
        const lineClasses = line.match(CLASS_PATTERN) || [];
        const lineSubjects = subjects.filter(s => line.toUpperCase().includes(s));

        for (const cls of lineClasses) {
            const key = cls.toUpperCase();
            if (!map[key]) map[key] = new Set();
            lineSubjects.forEach(s => map[key].add(s));
        }
    }

    // Convert Sets to Arrays
    for (const key of Object.keys(map)) {
        map[key] = Array.from(map[key]);
    }

    return map;
}

function extractRoomNear(text, cls, subject) {
    // Look for room patterns like "Salle B12", "S101", etc.
    const roomPattern = /\b(salle\s*)?([A-Z]?\d{2,3}[A-Z]?)\b/gi;
    const matches = text.match(roomPattern) || [];

    // Return first match or empty
    return matches[0]?.replace(/salle\s*/i, '').trim() || '';
}

export default { parseSmartDST };
