/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ÉCOLE DIRECTE API CLIENT
 * Unofficial API wrapper for École Directe integration
 * 
 * ⚠️ DISCLAIMER: This is based on the unofficial community-documented API.
 * Use responsibly and in accordance with École Directe's terms of service.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const ED_API_BASE = 'https://api.ecoledirecte.com/v3';

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE CODES
// ─────────────────────────────────────────────────────────────────────────────

export const ED_RESPONSE_CODES = {
    SUCCESS: 200,
    INVALID_CREDENTIALS: 505,
    ACCOUNT_BLOCKED: 510,
    MAINTENANCE: 520,
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export class EcoleDirecteError extends Error {
    constructor(message, code, data = null) {
        super(message);
        this.name = 'EcoleDirecteError';
        this.code = code;
        this.data = data;
    }
}

export class AuthenticationError extends EcoleDirecteError {
    constructor(message = 'Identifiants incorrects') {
        super(message, ED_RESPONSE_CODES.INVALID_CREDENTIALS);
        this.name = 'AuthenticationError';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encode data for form submission (École Directe expects URL-encoded data)
 */
function encodeFormData(data) {
    return `data=${encodeURIComponent(JSON.stringify(data))}`;
}

/**
 * Parse École Directe API response
 */
async function parseResponse(response) {
    const data = await response.json();

    if (data.code !== ED_RESPONSE_CODES.SUCCESS) {
        switch (data.code) {
            case ED_RESPONSE_CODES.INVALID_CREDENTIALS:
                throw new AuthenticationError();
            case ED_RESPONSE_CODES.ACCOUNT_BLOCKED:
                throw new EcoleDirecteError('Compte bloqué', data.code);
            case ED_RESPONSE_CODES.MAINTENANCE:
                throw new EcoleDirecteError('Service en maintenance', data.code);
            default:
                throw new EcoleDirecteError(data.message || 'Erreur inconnue', data.code);
        }
    }

    return data.data;
}

/**
 * Make authenticated request to École Directe API
 */
async function makeRequest(endpoint, token, body = {}) {
    const response = await fetch(`${ED_API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Token': token,
        },
        body: encodeFormData(body),
    });

    return parseResponse(response);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCOLE DIRECTE API CLIENT CLASS
// ─────────────────────────────────────────────────────────────────────────────

class EcoleDirecteClient {
    constructor() {
        this.token = null;
        this.account = null;
        this.modules = [];
    }

    /**
     * Authenticate with École Directe
     * @param {string} username - École Directe username
     * @param {string} password - École Directe password
     * @returns {Object} - Account information
     */
    async login(username, password) {
        try {
            const response = await fetch(`${ED_API_BASE}/login.awp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: encodeFormData({
                    identifiant: username,
                    motdepasse: password,
                }),
            });

            const data = await parseResponse(response);

            // Store token and account info
            this.token = data.token;
            this.account = data.accounts[0]; // Usually the first account
            this.modules = this.account.modules || [];

            return {
                token: this.token,
                account: this.sanitizeAccount(this.account),
                modules: this.modules.map(m => m.code),
            };
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Logout and clear session
     */
    logout() {
        this.token = null;
        this.account = null;
        this.modules = [];
    }

    /**
     * Check if client is authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.account;
    }

    /**
     * Sanitize account data for storage (remove sensitive info)
     */
    sanitizeAccount(account) {
        return {
            id: account.id,
            type: account.typeCompte, // E = Élève, P = Prof, 1 = Parent
            firstName: account.prenom,
            lastName: account.nom,
            email: account.email,
            photo: account.photo,
            classe: account.profile?.classe || null,
            classeId: account.profile?.classeId || null,
            school: account.nomEtablissement,
            schoolId: account.idEtablissement,
        };
    }

    /**
     * Get student timetable / schedule
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Array} - Schedule entries
     */
    async getSchedule(startDate, endDate) {
        this.ensureAuthenticated();

        const data = await makeRequest(
            `/E/${this.account.id}/emploidutemps.awp?verbe=get`,
            this.token,
            { dateDebut: startDate, dateFin: endDate }
        );

        return this.parseSchedule(data);
    }

    /**
     * Get homework (devoirs)
     * @returns {Array} - Homework assignments
     */
    async getHomework() {
        this.ensureAuthenticated();

        const data = await makeRequest(
            `/Eleves/${this.account.id}/cahierdetexte.awp?verbe=get`,
            this.token
        );

        return this.parseHomework(data);
    }

    /**
     * Get upcoming tests and controls
     * @returns {Array} - Tests and controls
     */
    async getTests() {
        this.ensureAuthenticated();

        // Tests are often grouped with homework in École Directe
        const data = await makeRequest(
            `/Eleves/${this.account.id}/cahierdetexte.awp?verbe=get`,
            this.token
        );

        return this.parseTests(data);
    }

    /**
     * Get grades
     * @returns {Object} - Grades data
     */
    async getGrades() {
        this.ensureAuthenticated();

        const data = await makeRequest(
            `/Eleves/${this.account.id}/notes.awp?verbe=get`,
            this.token
        );

        return data;
    }

    /**
     * Get class information
     * @returns {Object} - Class info
     */
    async getClassInfo() {
        this.ensureAuthenticated();

        const data = await makeRequest(
            `/classes/${this.account.profile?.classeId}/eleves.awp?verbe=get`,
            this.token
        );

        return data;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER / PARSER METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    ensureAuthenticated() {
        if (!this.isAuthenticated()) {
            throw new EcoleDirecteError('Non authentifié. Veuillez vous connecter.', 401);
        }
    }

    /**
     * Parse schedule data from API response
     */
    parseSchedule(data) {
        if (!Array.isArray(data)) return [];

        return data.map(entry => ({
            id: entry.id,
            subject: entry.matiere,
            subjectCode: entry.codeMatiere,
            teacher: entry.prof,
            room: entry.salle,
            start: entry.start_date,
            end: entry.end_date,
            canceled: entry.isAnnule || false,
            modified: entry.isModifie || false,
            color: entry.couleur,
        }));
    }

    /**
     * Parse homework data from API response
     */
    parseHomework(data) {
        const homeworkList = [];

        // École Directe returns homework grouped by date
        if (typeof data === 'object') {
            for (const [date, items] of Object.entries(data)) {
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        if (item.pourLe) {
                            homeworkList.push({
                                id: item.id,
                                subject: item.matiere,
                                subjectCode: item.codeMatiere,
                                teacher: item.nomProf,
                                dueDate: item.pourLe,
                                givenDate: date,
                                content: this.decodeContent(item.aFaire?.contenu || ''),
                                done: item.effectue || false,
                                type: 'homework',
                                weight: this.estimateHomeworkWeight(item),
                            });
                        }
                    });
                }
            }
        }

        return homeworkList;
    }

    /**
     * Parse tests/controls from homework data
     */
    parseTests(data) {
        const tests = [];

        if (typeof data === 'object') {
            for (const [date, items] of Object.entries(data)) {
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        // Check if it's a test/control
                        if (item.interrogation || item.contenuDeSeance?.toLowerCase().includes('contrôle')) {
                            tests.push({
                                id: item.id,
                                subject: item.matiere,
                                subjectCode: item.codeMatiere,
                                teacher: item.nomProf,
                                date: item.pourLe || date,
                                content: this.decodeContent(item.contenuDeSeance || ''),
                                type: 'test',
                                weight: 'CONTROL',
                            });
                        }
                    });
                }
            }
        }

        return tests;
    }

    /**
     * Decode Base64 content from API
     */
    decodeContent(content) {
        try {
            // École Directe often encodes content in Base64
            if (content && typeof content === 'string') {
                // Check if it looks like Base64
                if (/^[A-Za-z0-9+/=]+$/.test(content) && content.length > 20) {
                    return atob(content);
                }
            }
            return content;
        } catch {
            return content;
        }
    }

    /**
     * Estimate homework weight based on content
     */
    estimateHomeworkWeight(item) {
        const content = (item.aFaire?.contenu || '').toLowerCase();

        // Heavy indicators
        if (content.includes('rédaction') ||
            content.includes('dissertation') ||
            content.includes('dm complet') ||
            content.includes('projet')) {
            return 'HEAVY';
        }

        // Light indicators
        if (content.includes('exercice') ||
            content.includes('relire') ||
            content.includes('réviser') ||
            content.length < 50) {
            return 'LIGHT';
        }

        return 'MEDIUM';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

export const ecoleDirecteClient = new EcoleDirecteClient();

// ─────────────────────────────────────────────────────────────────────────────
// MOCK CLIENT FOR DEVELOPMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock client that simulates École Directe responses for development
 */
export class MockEcoleDirecteClient {
    constructor() {
        this.token = null;
        this.account = null;
        this.delay = 500; // Simulate network delay
    }

    async login(username, password) {
        await this.simulateDelay();

        // Accept any credentials for demo
        if (!username || !password) {
            throw new AuthenticationError();
        }

        this.token = 'mock-token-' + Date.now();
        this.account = {
            id: 12345,
            type: 'E',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@email.com',
            classe: 'Terminale S',
            classeId: 'TS1',
            school: 'Lycée Demo',
            schoolId: 1,
        };

        return {
            token: this.token,
            account: this.account,
            modules: ['EDT', 'NOTES', 'CAHIER_DE_TEXTES'],
        };
    }

    logout() {
        this.token = null;
        this.account = null;
    }

    isAuthenticated() {
        return !!this.token;
    }

    async getHomework() {
        await this.simulateDelay();

        const today = new Date();

        return [
            {
                id: 1,
                subject: 'Mathématiques',
                subjectCode: 'MATHS',
                teacher: 'M. Martin',
                dueDate: this.addDays(today, 1),
                givenDate: this.addDays(today, -2),
                content: 'Exercices 1 à 5 page 156',
                done: false,
                type: 'homework',
                weight: 'MEDIUM',
            },
            {
                id: 2,
                subject: 'Français',
                subjectCode: 'FRANCAIS',
                teacher: 'Mme Dubois',
                dueDate: this.addDays(today, 1),
                givenDate: this.addDays(today, -3),
                content: 'Rédaction sur le thème "La liberté"',
                done: false,
                type: 'homework',
                weight: 'HEAVY',
            },
            {
                id: 3,
                subject: 'Histoire-Géographie',
                subjectCode: 'HG',
                teacher: 'M. Bernard',
                dueDate: this.addDays(today, 2),
                givenDate: this.addDays(today, -1),
                content: 'Réviser le chapitre sur la Guerre Froide',
                done: true,
                type: 'homework',
                weight: 'LIGHT',
            },
            {
                id: 4,
                subject: 'Physique-Chimie',
                subjectCode: 'PC',
                teacher: 'Mme Laurent',
                dueDate: this.addDays(today, 3),
                givenDate: this.addDays(today, 0),
                content: 'DM: Cinématique et dynamique',
                done: false,
                type: 'homework',
                weight: 'HEAVY',
            },
            {
                id: 5,
                subject: 'SES',
                subjectCode: 'SES',
                teacher: 'M. Petit',
                dueDate: this.addDays(today, 1),
                givenDate: this.addDays(today, -2),
                content: 'Lire le document 3 page 78',
                done: false,
                type: 'homework',
                weight: 'LIGHT',
            },
        ];
    }

    async getTests() {
        await this.simulateDelay();

        const today = new Date();

        // Find next Saturday
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);

        return [
            {
                id: 101,
                subject: 'Mathématiques',
                subjectCode: 'MATHS',
                teacher: 'M. Martin',
                date: this.formatDate(nextSaturday),
                content: 'DST sur les intégrales - Durée 2h',
                type: 'dst',
                weight: 'DST',
                duration: 120,
            },
            {
                id: 102,
                subject: 'Philosophie',
                subjectCode: 'PHILO',
                teacher: 'M. Rousseau',
                date: this.addDays(today, 2),
                content: 'Contrôle sur Descartes',
                type: 'test',
                weight: 'CONTROL',
            },
        ];
    }

    async getSchedule(startDate, endDate) {
        await this.simulateDelay();

        // Return basic mock schedule
        return [
            { id: 1, subject: 'Mathématiques', teacher: 'M. Martin', room: 'A101', start: '08:00', end: '09:00' },
            { id: 2, subject: 'Français', teacher: 'Mme Dubois', room: 'B205', start: '09:00', end: '10:00' },
            { id: 3, subject: 'Histoire-Géo', teacher: 'M. Bernard', room: 'C102', start: '10:15', end: '11:15' },
        ];
    }

    // Helpers
    simulateDelay() {
        return new Promise(resolve => setTimeout(resolve, this.delay));
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return this.formatDate(result);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

export const mockEcoleDirecteClient = new MockEcoleDirecteClient();

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DEFAULT CLIENT (use mock in development)
// ─────────────────────────────────────────────────────────────────────────────

const isDev = import.meta.env.DEV;

export default isDev ? mockEcoleDirecteClient : ecoleDirecteClient;
