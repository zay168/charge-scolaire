/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOCK DATA FOR DEVELOPMENT
 * Realistic test data for the workload management system
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Date utilities
// ─────────────────────────────────────────────────────────────────────────────

const today = new Date();

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
}

function getNextSaturday(fromDate = today) {
    const date = new Date(fromDate);
    const day = date.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    date.setDate(date.getDate() + diff);
    return date.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export const mockClasses = [
    {
        id: 'TS1',
        name: 'Terminale S1',
        level: 'Terminale',
        track: 'Scientifique',
        studentCount: 32,
        mainTeacher: 'M. Dupont',
    },
    {
        id: 'TES2',
        name: 'Terminale ES2',
        level: 'Terminale',
        track: 'Économique',
        studentCount: 28,
        mainTeacher: 'Mme Martin',
    },
    {
        id: '1S3',
        name: 'Première S3',
        level: 'Première',
        track: 'Scientifique',
        studentCount: 30,
        mainTeacher: 'M. Bernard',
    },
    {
        id: 'TL2',
        name: 'Terminale L2',
        level: 'Terminale',
        track: 'Littéraire',
        studentCount: 25,
        mainTeacher: 'Mme Rousseau',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

export const mockSubjects = [
    { code: 'MATHS', name: 'Mathématiques', color: '#3B82F6' },
    { code: 'FRANCAIS', name: 'Français', color: '#EF4444' },
    { code: 'PHILO', name: 'Philosophie', color: '#8B5CF6' },
    { code: 'HG', name: 'Histoire-Géographie', color: '#F59E0B' },
    { code: 'PC', name: 'Physique-Chimie', color: '#10B981' },
    { code: 'SVT', name: 'SVT', color: '#22C55E' },
    { code: 'SES', name: 'SES', color: '#6366F1' },
    { code: 'LV1', name: 'Anglais', color: '#EC4899' },
    { code: 'LV2', name: 'Espagnol', color: '#F97316' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS (Homework, DMs, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const mockAssignments = [
    // === Aujourd'hui (charge élevée pour démo) ===
    {
        id: 1,
        classId: 'TS1',
        subject: 'Mathématiques',
        subjectCode: 'MATHS',
        teacher: 'M. Martin',
        type: 'homework',
        weight: 'MEDIUM',
        dueDate: addDays(today, 0),
        givenDate: addDays(today, -3),
        content: 'Exercices 12 à 18 page 245 - Intégrales',
        done: false,
    },
    {
        id: 2,
        classId: 'TS1',
        subject: 'Français',
        subjectCode: 'FRANCAIS',
        teacher: 'Mme Dubois',
        type: 'homework',
        weight: 'HEAVY',
        dueDate: addDays(today, 0),
        givenDate: addDays(today, -5),
        content: 'Commentaire composé sur Baudelaire - 2 pages minimum',
        done: false,
    },
    {
        id: 3,
        classId: 'TS1',
        subject: 'Anglais',
        subjectCode: 'LV1',
        teacher: 'Mrs. Smith',
        type: 'homework',
        weight: 'LIGHT',
        dueDate: addDays(today, 0),
        givenDate: addDays(today, -1),
        content: 'Vocabulary list chapter 5',
        done: true,
    },

    // === Demain ===
    {
        id: 4,
        classId: 'TS1',
        subject: 'Physique-Chimie',
        subjectCode: 'PC',
        teacher: 'M. Laurent',
        type: 'homework',
        weight: 'HEAVY',
        dueDate: addDays(today, 1),
        givenDate: addDays(today, -4),
        content: 'DM: Mécanique quantique - Exercices 1 à 5',
        done: false,
    },
    {
        id: 5,
        classId: 'TS1',
        subject: 'Philosophie',
        subjectCode: 'PHILO',
        teacher: 'M. Rousseau',
        type: 'test',
        weight: 'CONTROL',
        dueDate: addDays(today, 1),
        givenDate: addDays(today, -7),
        content: 'Contrôle sur Descartes et le doute méthodique',
        done: false,
    },

    // === Dans 2 jours ===
    {
        id: 6,
        classId: 'TS1',
        subject: 'Histoire-Géographie',
        subjectCode: 'HG',
        teacher: 'M. Bernard',
        type: 'homework',
        weight: 'MEDIUM',
        dueDate: addDays(today, 2),
        givenDate: addDays(today, -2),
        content: 'Fiche de révision sur la Guerre Froide',
        done: false,
    },
    {
        id: 7,
        classId: 'TS1',
        subject: 'SVT',
        subjectCode: 'SVT',
        teacher: 'Mme Petit',
        type: 'homework',
        weight: 'LIGHT',
        dueDate: addDays(today, 2),
        givenDate: addDays(today, -1),
        content: 'Relire le cours sur la génétique',
        done: false,
    },

    // === Autres classes ===
    {
        id: 8,
        classId: 'TES2',
        subject: 'SES',
        subjectCode: 'SES',
        teacher: 'M. Garcia',
        type: 'homework',
        weight: 'HEAVY',
        dueDate: addDays(today, 1),
        givenDate: addDays(today, -6),
        content: 'Dissertation: Le marché peut-il s\'autoréguler?',
        done: false,
    },
    {
        id: 9,
        classId: 'TES2',
        subject: 'Mathématiques',
        subjectCode: 'MATHS',
        teacher: 'Mme Martin',
        type: 'homework',
        weight: 'MEDIUM',
        dueDate: addDays(today, 1),
        givenDate: addDays(today, -3),
        content: 'Probabilités - Exercices du polycopié',
        done: false,
    },
    {
        id: 10,
        classId: 'TES2',
        subject: 'Histoire-Géographie',
        subjectCode: 'HG',
        teacher: 'M. Bernard',
        type: 'homework',
        weight: 'MEDIUM',
        dueDate: addDays(today, 1),
        givenDate: addDays(today, -2),
        content: 'Croquis sur la mondialisation',
        done: false,
    },

    // === Semaine prochaine ===
    {
        id: 11,
        classId: 'TS1',
        subject: 'Mathématiques',
        subjectCode: 'MATHS',
        teacher: 'M. Martin',
        type: 'homework',
        weight: 'HEAVY',
        dueDate: addDays(today, 5),
        givenDate: addDays(today, 0),
        content: 'DM: Suites et séries numériques',
        done: false,
    },
    {
        id: 12,
        classId: '1S3',
        subject: 'Physique-Chimie',
        subjectCode: 'PC',
        teacher: 'M. Laurent',
        type: 'homework',
        weight: 'MEDIUM',
        dueDate: addDays(today, 3),
        givenDate: addDays(today, -1),
        content: 'TP à préparer: La lumière',
        done: false,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// DSTs (Devoirs Surveillés - Saturday tests)
// ─────────────────────────────────────────────────────────────────────────────

export const mockDSTs = [
    {
        id: 101,
        subject: 'Mathématiques',
        subjectCode: 'MATHS',
        teacher: 'M. Martin',
        classes: ['TS1', 'TS2'],
        date: getNextSaturday(),
        startTime: '08:00',
        endTime: '11:00',
        duration: 180, // minutes
        room: 'Amphi A',
        type: 'dst',
        weight: 'DST',
        topics: ['Intégrales', 'Suites', 'Probabilités'],
        description: 'DST de synthèse - Chapitres 1 à 4',
    },
    {
        id: 102,
        subject: 'Physique-Chimie',
        subjectCode: 'PC',
        teacher: 'M. Laurent',
        classes: ['TS1'],
        date: getNextSaturday(addDays(today, 7)),
        startTime: '08:00',
        endTime: '10:00',
        duration: 120,
        room: 'Salle 201',
        type: 'dst',
        weight: 'DST',
        topics: ['Mécanique', 'Ondes'],
        description: 'DST mi-trimestre',
    },
    {
        id: 103,
        subject: 'SES',
        subjectCode: 'SES',
        teacher: 'M. Garcia',
        classes: ['TES2', 'TES3'],
        date: getNextSaturday(addDays(today, 7)),
        startTime: '10:30',
        endTime: '12:30',
        duration: 120,
        room: 'Amphi B',
        type: 'dst',
        weight: 'DST',
        topics: ['Marché', 'État'],
        description: 'Épreuve type bac',
    },
    {
        id: 104,
        subject: 'Philosophie',
        subjectCode: 'PHILO',
        teacher: 'M. Rousseau',
        classes: ['TS1', 'TES2', 'TL2'],
        date: getNextSaturday(addDays(today, 14)),
        startTime: '08:00',
        endTime: '12:00',
        duration: 240,
        room: 'Gymnase',
        type: 'dst',
        weight: 'DST',
        topics: ['La liberté', 'La conscience'],
        description: 'Bac blanc de philosophie',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

export const mockTeachers = [
    {
        id: 'T001',
        firstName: 'Jean',
        lastName: 'Martin',
        email: 'j.martin@lycee.fr',
        subjects: ['Mathématiques'],
        classes: ['TS1', 'TS2', '1S3'],
    },
    {
        id: 'T002',
        firstName: 'Marie',
        lastName: 'Dubois',
        email: 'm.dubois@lycee.fr',
        subjects: ['Français'],
        classes: ['TS1', 'TL2'],
    },
    {
        id: 'T003',
        firstName: 'Pierre',
        lastName: 'Laurent',
        email: 'p.laurent@lycee.fr',
        subjects: ['Physique-Chimie'],
        classes: ['TS1', '1S3'],
    },
    {
        id: 'T004',
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 's.bernard@lycee.fr',
        subjects: ['Histoire-Géographie'],
        classes: ['TS1', 'TES2', 'TL2'],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// WORKLOAD STATISTICS (for charts)
// ─────────────────────────────────────────────────────────────────────────────

export function generateMockWeeklyStats(classId = null) {
    const weeks = [];

    for (let i = -4; i <= 4; i++) {
        const weekStart = addDays(today, i * 7 - today.getDay() + 1);
        const assignments = mockAssignments.filter(a => {
            if (classId && a.classId !== classId) return false;
            const dueDate = new Date(a.dueDate);
            const weekStartDate = new Date(weekStart);
            const weekEndDate = new Date(addDays(weekStart, 6));
            return dueDate >= weekStartDate && dueDate <= weekEndDate;
        });

        const score = assignments.reduce((sum, a) => {
            const weights = { LIGHT: 1, MEDIUM: 2, HEAVY: 3, CONTROL: 3, DST: 5 };
            return sum + (weights[a.weight] || 2);
        }, 0);

        weeks.push({
            week: `S${Math.abs(i) + 1}`,
            weekStart,
            score,
            count: assignments.length,
            isCurrent: i === 0,
        });
    }

    return weeks;
}

export function generateMockDailyStats(classId = null) {
    const days = [];

    for (let i = -7; i <= 7; i++) {
        const date = addDays(today, i);
        const assignments = mockAssignments.filter(a => {
            if (classId && a.classId !== classId) return false;
            return a.dueDate === date;
        });

        const score = assignments.reduce((sum, a) => {
            const weights = { LIGHT: 1, MEDIUM: 2, HEAVY: 3, CONTROL: 3, DST: 5 };
            return sum + (weights[a.weight] || 2);
        }, 0);

        const dayDate = new Date(date);
        const dayName = dayDate.toLocaleDateString('fr-FR', { weekday: 'short' });

        days.push({
            date,
            dayName,
            score,
            count: assignments.length,
            isToday: i === 0,
            isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
        });
    }

    return days;
}
