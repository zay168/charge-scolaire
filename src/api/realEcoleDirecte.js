/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ÉCOLE DIRECTE REAL API CLIENT
 * Based on Ecole-Directe-Plus implementation and official API documentation
 * 
 * This client makes real API calls to EcoleDirecte.
 * Implements:
 * - GTK Token (required since 24/03/2025)
 * - QCM Security (double authentication code 250)
 * - Mobile-style authentication with UUID
 * 
 * NOTE: Due to CORS restrictions, this requires:
 * - Vite's proxy configuration for development (/api/ed)
 * - A proxy server (see server/proxy.js)
 * - The EDP Unblock browser extension
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ED_API_BASE, getElectronHeaders } from './config.js';

const API_VERSION = '4.75.0';

console.log('🔧 API Config:', {
    apiBase: ED_API_BASE
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES FROM ECOLEDIRECTE
// ─────────────────────────────────────────────────────────────────────────────

const ED_ERROR_CODES = {
    200: 'success',
    250: 'QCM de sécurité requis',
    505: 'Identifiant et/ou mot de passe invalide',
    517: 'Version API invalide',
    520: 'Token invalide',
    522: 'Identifiant et/ou mot de passe invalide',
    525: 'Session expirée',
    535: 'Établissement non disponible',
    202: 'Compte non créé',
    40129: 'Format JSON invalide',
    74000: 'Connexion au serveur échouée',
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
    constructor(message = 'Identifiants incorrects', code = 505) {
        super(message, code);
        this.name = 'AuthenticationError';
    }
}

/**
 * Thrown when QCM security verification is required (code 250)
 */
export class QCMRequiredError extends EcoleDirecteError {
    constructor(token, question, propositions) {
        super('QCM de sécurité requis', 250);
        this.name = 'QCMRequiredError';
        this.token = token;
        this.question = question;
        this.propositions = propositions;
    }
}

/**
 * @deprecated Use QCMRequiredError instead
 */
export class A2FRequiredError extends QCMRequiredError {
    constructor(token, token2fa) {
        super(token, null, null);
        this.name = 'A2FRequiredError';
        this.token2fa = token2fa;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────



/**
 * Encode string to Base64 (UTF-8 safe)
 */
// eslint-disable-next-line no-unused-vars
function encodeBase64(str) {
    if (!str) return '';
    try {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch {
        return btoa(str);
    }
}

/**
 * Decode Base64 string to UTF-8 text
 * Handles proper character encoding for French accents etc.
 */
function decodeBase64(str) {
    if (!str) return '';
    try {
        // Handle URL encoding if present
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode base64 to binary string
        const binaryString = atob(base64);
        // Convert binary string to UTF-8 bytes
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        console.warn('Failed to decode Base64 content:', e);
        // Fallback for simple content
        try { return atob(str); } catch { return str; }
    }
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL API CLIENT CLASS
// ─────────────────────────────────────────────────────────────────────────────

class RealEcoleDirecteClient {
    constructor() {
        this.token = null;
        this.token2fa = null; // 2FA token from login response
        this.gtkToken = null;
        this.account = null;
        this.modules = [];
        this.abortControllers = [];
        this.deviceUUID = this.getOrCreateDeviceUUID();

        // QCM state
        this.pendingQCM = null;
        this.qcmCredentials = null; // Store credentials for re-login after QCM

        // Saved CN/CV for future logins (can be reused)
        this.savedCnCv = this.loadCnCv();

        // Access token for silent relogin (mobile-style authentication)
        this.accessToken = this.loadAccessToken();
        this.username = localStorage.getItem('ed_username') || null;

        // Callback when session expires (set by AuthContext)
        this.onSessionExpired = null;

        // Silent relogin in progress flag
        this.silentReloginPromise = null;

        // Session ID for stateful proxy (Railway)
        this.sessionId = null;

        // Rate Limiting / Anti-Ban System
        this.activeRequests = 0;
        this.requestQueue = [];
        this.MAX_CONCURRENT_REQUESTS = 3; // Keep low to avoid detection
        this.REQUEST_DELAY_MS = 700; // Delay between request starts
    }

    /**
     * RATE LIMITING: Acquire a slot to perform a request
     */
    async _acquireRequestSlot() {
        if (this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
            this.activeRequests++;
            // Add a small delay for the next one
            await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY_MS));
            return;
        }

        // Wait in queue
        return new Promise(resolve => {
            this.requestQueue.push(resolve);
        });
    }

    /**
     * RATE LIMITING: Release a slot and process next request
     */
    _releaseRequestSlot() {
        this.activeRequests--;
        this._processQueue();
    }

    /**
     * Process next item in queue
     */
    async _processQueue() {
        if (this.requestQueue.length > 0 && this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
            this.activeRequests++;
            const nextResolve = this.requestQueue.shift();

            // Add mandatory delay before starting the next queued request
            await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY_MS));

            nextResolve();
        }
    }

    /**
     * Get or create a persistent device UUID
     */
    getOrCreateDeviceUUID() {
        const stored = localStorage.getItem('ed_device_uuid');
        if (stored) return stored;

        const uuid = generateUUID();
        localStorage.setItem('ed_device_uuid', uuid);
        return uuid;
    }

    /**
     * Load saved CN/CV from localStorage
     * Check both our key and EDP's key for compatibility
     */
    loadCnCv() {
        try {
            // First try EDP's format (A2FInfo)
            const edpSaved = localStorage.getItem('A2FInfo');
            if (edpSaved) {
                const parsed = JSON.parse(edpSaved);
                if (parsed.cn && parsed.cv) {
                    console.log('📦 Loaded A2F from EDP localStorage');
                    return parsed;
                }
            }

            // Fall back to our format
            const saved = localStorage.getItem('ed_cn_cv');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }

    /**
     * Save CN/CV to localStorage for future logins
     */
    saveCnCv(cn, cv) {
        this.savedCnCv = { cn, cv };
        localStorage.setItem('ed_cn_cv', JSON.stringify({ cn, cv }));
    }

    /**
     * Load access token for silent relogin
     */
    loadAccessToken() {
        return localStorage.getItem('ed_access_token') || null;
    }

    /**
     * Save access token for silent relogin
     */
    saveAccessToken(accessToken, username) {
        this.accessToken = accessToken;
        this.username = username;
        if (accessToken) {
            localStorage.setItem('ed_access_token', accessToken);
            localStorage.setItem('ed_username', username);
        }
    }

    /**
     * Clear access token (on logout)
     */
    clearAccessToken() {
        this.accessToken = null;
        this.username = null;
        localStorage.removeItem('ed_access_token');
        localStorage.removeItem('ed_username');
    }

    /**
     * Step 1: Get GTK token (required since 24/03/2025)
     * When using EDP Unblock extension, it handles GTK automatically via postMessage
     * Otherwise, use Vite proxy method
     */
    async fetchGtkToken() {
        if (false) {
            // Use EDP Unblock extension method (like Ecole-Directe-Plus)
            return await this.setupGtkViaExtension();
        }

        // Fallback: Use Vite proxy method
        try {
            const response = await fetch(`${ED_API_BASE}/login.awp?gtk=1&v=${API_VERSION}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    ...getElectronHeaders(),
                },
            });

            const gtkHeader = response.headers.get('x-gtk-token');

            // Capture Session ID from proxy (essential for Railway backend)
            const sessionId = response.headers.get('x-session-id');
            if (sessionId) {
                this.sessionId = sessionId;
                console.log('✅ Session ID captured:', sessionId);
            }

            if (gtkHeader) {
                this.gtkToken = gtkHeader;
                console.log('✅ GTK token retrieved from proxy header');
                return this.gtkToken;
            }

            console.log('ℹ️ GTK request completed (proxy will forward cookie)');
            return null;
        } catch (error) {
            console.warn('⚠️ GTK token fetch failed (non-critical):', error.message);
            return null;
        }
    }

    /**
     * Setup GTK via EDP Unblock extension (like Ecole-Directe-Plus does)
     * The extension intercepts the login request, captures cookies, and sets up
     * header modification rules automatically
     */
    async setupGtkViaExtension() {
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.data && event.data.type === 'EDPU_MESSAGE') {
                    window.removeEventListener('message', handleMessage);
                    const message = event.data.payload;
                    console.log('📩 EDP Unblock message:', message.action);

                    if (message.action === 'gtkRulesUpdated') {
                        console.log('✅ GTK rules updated by extension');
                        this.edpUnblockReady = true;
                        resolve();
                    } else if (message.action === 'noGtkCookie' || message.action === 'noCookie') {
                        reject(new Error('EDPUNoCookie'));
                    }
                }
            };

            window.addEventListener('message', handleMessage);

            // Trigger the GTK cookie fetch - extension will intercept this
            fetch(`/login.awp?gtk=1&v=${API_VERSION}`, {
                method: 'GET',
                referrerPolicy: 'no-referrer',
            })
                .then(() => {
                    // Set timeout for extension response
                    setTimeout(() => {
                        window.removeEventListener('message', handleMessage);
                        if (!this.edpUnblockReady) {
                            console.warn('⚠️ EDP Unblock extension did not respond in time');
                            // Don't reject - try to continue anyway, extension may have old rules
                            resolve();
                        }
                    }, 3000);
                })
                .catch((error) => {
                    window.removeEventListener('message', handleMessage);
                    console.error('❌ GTK fetch failed:', error);
                    reject(new Error('GTKFetchFailed'));
                });
        });
    }

    /**
     * Authenticate with École Directe
     * @param {string} username - École Directe username
     * @param {string} password - École Directe password
     * @param {Object} options - Login options
     * @returns {Object} - Account information
     */
    async login(username, password, options = {}) {
        // Try to use saved A2F info (cn/cv) if available
        const savedA2F = this.loadCnCv();
        const { rememberMe = false, cnCv = savedA2F } = options;

        const controller = new AbortController();
        this.abortControllers.push(controller);

        // Store credentials in case we need QCM
        this.qcmCredentials = { username, password, rememberMe };

        try {
            // Step 1: Setup GTK via extension (required before login)
            await this.fetchGtkToken();

            // Build login payload with mobile-style authentication for silent relogin
            // Credentials must be encoded like in Ecole-Directe-Plus
            const payload = {
                identifiant: username, // Removed encodeURIComponent (handled by JSON.stringify)
                motdepasse: password,  // Removed encodeURIComponent (handled by JSON.stringify)
                isReLogin: false,
                sesouvenirdemoi: rememberMe, // Enable mobile-style auth for token renewal
                uuid: this.deviceUUID, // Device identifier for token renewal
                ...(cnCv || {}),
                fa: (cnCv && cnCv.cn && cnCv.cv) ? [cnCv] : []
            };

            // When using EDP Unblock, use direct API URL
            const loginUrl = false
                ? `/login.awp?v=${API_VERSION}`
                : `${ED_API_BASE}/login.awp?v=${API_VERSION}`;

            const body = 'data=' + JSON.stringify(payload);

            // Build headers - only include tokens if they have values
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...getElectronHeaders(), // Add Origin/Referer/User-Agent for Electron
            };
            // Forward Session ID if available
            if (this.sessionId) headers['X-Session-Id'] = this.sessionId;

            if (this.gtkToken) headers['X-Gtk'] = this.gtkToken;
            if (this.token) headers['X-Token'] = this.token;
            if (this.token2fa) headers['2FA-Token'] = this.token2fa;

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers,
                body: body,
                signal: controller.signal,
                referrerPolicy: 'no-referrer',
            });

            const text = await response.text();

            if (!text) {
                throw new EcoleDirecteError(
                    'Aucune réponse du serveur. Vérifiez votre connexion ou utilisez un proxy.',
                    0
                );
            }

            const data = JSON.parse(text);

            // Get token from response
            const newToken = data.token || response.headers.get('x-token');
            const new2faToken = response.headers.get('2fa-token');

            if (data.code === 200) {
                // Success!
                this.token = newToken;
                if (new2faToken) this.token2fa = new2faToken;

                const accounts = data.data.accounts;
                // For teacher login, prefer P accounts; otherwise use first account
                const primaryAccount = accounts[0];

                this.account = this.parseAccount(primaryAccount);
                this.modules = this.account.modules || [];

                // Save access_token for silent relogin (mobile-style auth)
                if (rememberMe && primaryAccount.accessToken) {
                    this.saveAccessToken(primaryAccount.accessToken, username);
                    console.log('🔑 Access token saved for silent relogin');
                }

                // Clear QCM state
                this.pendingQCM = null;
                this.qcmCredentials = null;

                return {
                    token: this.token,
                    account: this.account,
                    accounts: accounts.map(a => this.parseAccount(a)),
                    modules: this.modules.map(m => m.code),
                };
            } else if (data.code === 250) {
                // QCM Security required!
                console.log('🔒 QCM Security required (code 250)');

                // Get tokens from response
                this.token = newToken;
                this.token2fa = response.headers.get('2fa-token');

                // console.log('📝 Tokens captured from response headers');

                // Fetch the QCM question
                const qcm = await this.fetchQCM();

                throw new QCMRequiredError(newToken, qcm.question, qcm.propositions);
            } else {
                // Error
                const errorMessage = ED_ERROR_CODES[data.code] || data.message || 'Erreur inconnue';
                throw new AuthenticationError(errorMessage, data.code);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new EcoleDirecteError('Requête annulée', 0);
            }
            if (error instanceof EcoleDirecteError) {
                throw error;
            }
            // Network error or CORS issue
            throw new EcoleDirecteError(
                'Erreur réseau. Vérifiez votre connexion ou configurez le proxy.',
                0,
                { originalError: error.message }
            );
        } finally {
            const index = this.abortControllers.indexOf(controller);
            if (index > -1) {
                this.abortControllers.splice(index, 1);
            }
        }
    }

    /**
     * Silent relogin using access_token (mobile-style authentication)
     * This allows token renewal without password
     * @returns {Promise<Object>} - Account information if successful
     */
    async silentRelogin() {
        // Prevent multiple concurrent relogin attempts
        if (this.silentReloginPromise) {
            return this.silentReloginPromise;
        }

        // Check if we have the required data
        if (!this.accessToken || !this.username || !this.deviceUUID) {
            console.log('⚠️ Silent relogin not possible: missing credentials');
            return null;
        }

        console.log('🔄 Attempting silent relogin...');

        this.silentReloginPromise = this._performSilentRelogin();

        try {
            const result = await this.silentReloginPromise;
            return result;
        } finally {
            this.silentReloginPromise = null;
        }
    }

    async _performSilentRelogin() {
        try {
            // Step 1: Setup GTK via extension
            await this.fetchGtkToken();

            // Build relogin payload (mobile-style)
            const payload = {
                identifiant: this.username,
                motdepasse: '', // Empty password for relogin
                isReLogin: true,
                uuid: this.deviceUUID,
                typeCompte: this.account?.typeCompte || 'E',
                accesstoken: this.accessToken,
                ...(this.savedCnCv || {}),
                fa: (this.savedCnCv && this.savedCnCv.cn && this.savedCnCv.cv)
                    ? [this.savedCnCv] : []
            };

            const loginUrl = false
                ? `/login.awp?v=${API_VERSION}`
                : `${ED_API_BASE}/login.awp?v=${API_VERSION}`;

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...(this.sessionId ? { 'X-Session-Id': this.sessionId } : {})
                },
                body: 'data=' + JSON.stringify(payload),
                referrerPolicy: 'no-referrer',
            });

            const text = await response.text();
            if (!text) {
                throw new Error('Empty response');
            }

            const data = JSON.parse(text);

            if (data.code === 200) {
                // Success!
                this.token = data.token || response.headers.get('x-token');
                this.token2fa = response.headers.get('2fa-token') || this.token2fa;

                const accounts = data.data.accounts;
                const primaryAccount = accounts[0];

                this.account = this.parseAccount(primaryAccount);
                this.modules = this.account.modules || [];

                // Update access token if provided
                if (primaryAccount.accessToken) {
                    this.saveAccessToken(primaryAccount.accessToken, this.username);
                }

                console.log('✅ Silent relogin successful');
                return {
                    token: this.token,
                    account: this.account,
                };
            } else {
                console.warn('⚠️ Silent relogin failed with code:', data.code);
                // Clear invalid access token
                this.clearAccessToken();
                return null;
            }
        } catch (error) {
            console.error('❌ Silent relogin error:', error);
            // Clear access token on error
            this.clearAccessToken();
            return null;
        }
    }

    /**
     * Step 2 (if code 250): Fetch QCM question
     * According to documentation, use the token from the login response body
     */
    async fetchQCM() {
        // Use direct API URL (extension handles CORS)
        const url = false
            ? `/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`
            : `${ED_API_BASE}/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Token': this.token,
                '2FA-Token': this.token2fa,
                ...(this.sessionId ? { 'X-Session-Id': this.sessionId } : {})
            },
            body: 'data={}',
            referrerPolicy: 'no-referrer',
        });

        const text = await response.text();
        const data = JSON.parse(text);

        // Update tokens from response headers
        const newToken = response.headers.get('x-token');
        const new2faToken = response.headers.get('2fa-token');
        if (newToken) this.token = newToken;
        if (new2faToken) this.token2fa = new2faToken;

        if (data.code !== 200) {
            console.error('❌ QCM fetch failed:', data);
            throw new EcoleDirecteError('Erreur lors de la récupération du QCM: ' + (data.message || 'code ' + data.code), data.code);
        }

        // Decode Base64 question and propositions
        const question = decodeBase64(data.data.question);
        const propositions = data.data.propositions.map(p => decodeBase64(p));

        console.log('✅ QCM loaded successfully:', question);

        this.pendingQCM = {
            question,
            propositions,
            rawPropositions: data.data.propositions, // Keep encoded for response
        };

        return this.pendingQCM;
    }

    /**
     * Step 3 (if code 250): Answer QCM and complete login
     * @param {number} answerIndex - Index of the selected answer (0-based)
     */
    async answerQCM(answerIndex) {
        if (!this.pendingQCM || !this.qcmCredentials) {
            throw new EcoleDirecteError('Aucun QCM en attente', 0);
        }

        const encodedAnswer = this.pendingQCM.rawPropositions[answerIndex];

        // Use direct API URL (extension handles CORS)
        const url = false
            ? `/connexion/doubleauth.awp?verbe=post&v=${API_VERSION}`
            : `${ED_API_BASE}/connexion/doubleauth.awp?verbe=post&v=${API_VERSION}`;

        // EDP uses { choix: encodedAnswer } as the body
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Token': this.token,
                '2FA-Token': this.token2fa,
                ...(this.sessionId ? { 'X-Session-Id': this.sessionId } : {})
            },
            body: 'data=' + JSON.stringify({ choix: encodedAnswer }),
            referrerPolicy: 'no-referrer',
        });

        const text = await response.text();
        const data = JSON.parse(text);

        // Update tokens from response headers
        const newToken = response.headers.get('x-token');
        const new2faToken = response.headers.get('2fa-token');
        if (newToken) this.token = newToken;
        if (new2faToken) this.token2fa = new2faToken;

        if (data.code !== 200) {
            throw new EcoleDirecteError('Réponse incorrecte au QCM', data.code);
        }

        console.log('✅ QCM answer correct! Got CN/CV:', data.data);

        // Save CN/CV for future logins
        const { cn, cv } = data.data;
        this.saveCnCv(cn, cv);

        // Re-login with CN/CV - this will skip the QCM
        const { username, password, rememberMe } = this.qcmCredentials;
        return await this.login(username, password, { rememberMe, cnCv: { cn, cv } });
    }

    /**
     * Parse raw account data from API
     */
    parseAccount(rawAccount) {
        const accountType = rawAccount.typeCompte;

        if (accountType === 'E') {
            // Student account
            return {
                id: rawAccount.id,
                type: 'E',
                accountType: 'student',
                firstName: rawAccount.prenom,
                lastName: rawAccount.nom,
                email: rawAccount.email,
                photo: rawAccount.profile?.photo,
                classe: rawAccount.profile?.classe?.libelle || 'Inconnue',
                classeCode: rawAccount.profile?.classe?.code || '',
                classeId: rawAccount.profile?.classe?.id,
                school: rawAccount.profile?.nomEtablissement,
                schoolId: rawAccount.idEtablissement,
                schoolYear: rawAccount.anneeScolaireCourante,
                lastConnection: rawAccount.lastConnexion,
                modules: rawAccount.modules || [],
            };
        } else if (accountType === 'P') {
            // Teacher/Professor account
            return {
                id: rawAccount.id,
                type: 'P',
                accountType: 'teacher',
                firstName: rawAccount.prenom,
                lastName: rawAccount.nom,
                email: rawAccount.email,
                photo: rawAccount.profile?.photo,
                school: rawAccount.profile?.nomEtablissement,
                schoolId: rawAccount.idEtablissement,
                schoolYear: rawAccount.anneeScolaireCourante,
                lastConnection: rawAccount.lastConnexion,
                modules: rawAccount.modules || [],
                // Teacher-specific fields
                classes: rawAccount.profile?.classes || [],
                subjects: rawAccount.profile?.matieres || [],
            };
        } else {
            // Parent account (1, F) or other
            return {
                id: rawAccount.id,
                type: accountType,
                accountType: 'parent',
                firstName: rawAccount.prenom,
                lastName: rawAccount.nom,
                email: rawAccount.email,
                children: rawAccount.profile?.eleves?.map(e => ({
                    id: e.id,
                    firstName: e.prenom,
                    lastName: e.nom,
                    photo: e.photo,
                    classe: e.classe?.libelle,
                    school: e.nomEtablissement,
                })) || [],
                modules: rawAccount.modules || [],
            };
        }
    }

    /**
     * Logout and clear session
     * Clears CN/CV to force QCM on next login
     */
    logout() {
        // Abort all pending requests
        this.abortControllers.forEach(c => c.abort());
        this.abortControllers = [];

        this.token = null;
        this.token2fa = null;
        this.gtkToken = null;
        this.account = null;
        this.modules = [];
        this.pendingQCM = null;
        this.qcmCredentials = null;
        this.savedCnCv = null;

        // Clear stored credentials and access token
        this.clearAccessToken();

        // Clear CN/CV data (forces QCM on next login)
        localStorage.removeItem('ed_cn_cv');
        localStorage.removeItem('A2FInfo');
        localStorage.removeItem('ed_device_uuid');

        // Clear Electron cookies if available
        if (typeof window !== 'undefined' && window.electronAPI?.clearCookies) {
            window.electronAPI.clearCookies().catch(() => { });
        }

        console.log('🚪 Logged out and cleared all credentials + CN/CV');
    }

    /**
     * Check if client is authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.account;
    }

    /**
     * Get classes for the current teacher
     */
    async getClasses() {
        if (!this.account || this.account.accountType !== 'teacher') {
            return [];
        }

        // Return classes from account profile, mapped to standarized format
        return (this.account.classes || []).map(c => ({
            id: c.id,
            name: c.libelle || c.code,
            code: c.code
        }));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREDENTIAL STORAGE FOR SILENT RECONNECTION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Simple obfuscation for credentials (NOT secure encryption, just basic protection)
     * In production, use proper encryption or server-side storage
     */
    _obfuscate(str) {
        return btoa(encodeURIComponent(str).split('').reverse().join(''));
    }

    _deobfuscate(str) {
        try {
            return decodeURIComponent(atob(str).split('').reverse().join(''));
        } catch {
            return null;
        }
    }

    /**
     * Store credentials for silent reconnection
     */
    storeCredentials(username, password) {
        try {
            const data = {
                u: this._obfuscate(username),
                p: this._obfuscate(password),
                t: Date.now()
            };
            localStorage.setItem('ed_creds', JSON.stringify(data));
            console.log('🔐 ED credentials stored for silent reconnection');
        } catch (e) {
            console.warn('Could not store ED credentials:', e);
        }
    }

    /**
     * Get stored credentials
     */
    getStoredCredentials() {
        try {
            const data = JSON.parse(localStorage.getItem('ed_creds'));
            if (!data) return null;

            // Credentials expire after 24 hours
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - data.t > maxAge) {
                this.clearStoredCredentials();
                return null;
            }

            const username = this._deobfuscate(data.u);
            const password = this._deobfuscate(data.p);

            if (!username || !password) return null;
            return { username, password };
        } catch {
            return null;
        }
    }

    /**
     * Clear stored credentials
     */
    clearStoredCredentials() {
        localStorage.removeItem('ed_creds');
    }

    /**
     * Attempt silent reconnection
     * First tries access_token based relogin (no password needed)
     * Falls back to stored credentials if that fails
     * Returns true if successful, false otherwise
     */
    async silentReconnect() {
        // Already authenticated
        if (this.isAuthenticated()) {
            console.log('✅ ED already authenticated');
            return true;
        }

        // First try access_token based silent relogin (mobile-style)
        if (this.accessToken && this.username) {
            console.log('🔄 Attempting silent relogin via access_token...');
            const result = await this.silentRelogin();
            if (result) {
                console.log('✅ Silent relogin via access_token successful');
                return true;
            }
            console.log('⚠️ Access_token relogin failed, trying stored credentials...');
        }

        // Fallback: Try stored credentials (password-based)
        const creds = this.getStoredCredentials();
        if (!creds) {
            console.log('ℹ️ No stored ED credentials');
            return false;
        }

        console.log('🔄 Attempting silent ED reconnection with credentials...');
        try {
            await this.login(creds.username, creds.password);
            console.log('✅ Silent ED reconnection successful');
            return true;
        } catch (e) {
            console.warn('⚠️ Silent ED reconnection failed:', e.message);
            // If login failed, credentials might be wrong, clear them
            if (e.code === 505 || e.code === 522) {
                this.clearStoredCredentials();
            }
            return false;
        }
    }

    /**
     * Check if QCM is pending
     */
    isQCMPending() {
        return !!this.pendingQCM;
    }

    /**
     * Get pending QCM data
     */
    getPendingQCM() {
        return this.pendingQCM;
    }

    /**
     * Logout and clear all session data
     * Clears CN/CV to force QCM on next login
     */
    logout() {
        this.token = null;
        this.token2fa = null;
        this.gtkToken = null;
        this.account = null;
        this.modules = [];
        this.pendingQCM = null;
        this.qcmCredentials = null;
        this.savedCnCv = null;

        // Clear stored credentials and access token
        this.clearStoredCredentials();
        this.clearAccessToken();

        // Clear CN/CV data (forces QCM on next login)
        localStorage.removeItem('ed_cn_cv');
        localStorage.removeItem('A2FInfo');
        localStorage.removeItem('ed_device_uuid');

        // Clear Electron cookies if available
        if (typeof window !== 'undefined' && window.electronAPI?.clearCookies) {
            window.electronAPI.clearCookies().catch(() => { });
        }

        console.log('🚪 Logged out and cleared all credentials + CN/CV');
    }

    /**
     * Make authenticated request to École Directe API
     */
    async makeRequest(endpoint, body = {}, queryParams = '') {
        // RATE LIMITING / QUEUE SYSTEM
        // Wait until we have a slot available
        await this._acquireRequestSlot();

        if (!this.isAuthenticated()) {
            this._releaseRequestSlot(); // Release if we fail early
            throw new EcoleDirecteError('Non authentifié', 401);
        }

        const controller = new AbortController();
        this.abortControllers.push(controller);

        try {
            const url = endpoint.startsWith('http')
                ? endpoint
                : `${ED_API_BASE}${endpoint}${queryParams ? `?${queryParams}` : ''}`;

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Token': this.token,
            };

            // Forward Session ID if available
            if (this.sessionId) {
                headers['X-Session-Id'] = this.sessionId;
            }
            // Add 2FA-Token if available (needed after QCM auth)
            if (this.token2fa) {
                headers['2FA-Token'] = this.token2fa;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: 'data=' + JSON.stringify(body),
                signal: controller.signal,
                credentials: false ? 'omit' : 'include',
            });

            const data = await response.json();

            // Update token if returned
            if (data.token) {
                this.token = data.token;
            }

            if (data.code === 200) {
                return data.data;
            } else if (data.code === 520 || data.code === 525) {
                // Token expired - notify callback if set
                if (this.onSessionExpired) {
                    this.onSessionExpired();
                }
                throw new EcoleDirecteError('Session expirée, veuillez vous reconnecter', data.code);
            } else {
                if (data.code === 505) {
                    throw new EcoleDirecteError(
                        'Mot de passe invalide ou nouvelle connexion détectée. Vérifiez vos emails (validation IP demandée par École Directe) ou réessayez.',
                        505
                    );
                }
                throw new EcoleDirecteError(data.message || 'Erreur lors de la connexion', data.code);
            }
        } finally {
            const index = this.abortControllers.indexOf(controller);
            if (index > -1) {
                this.abortControllers.splice(index, 1);
            }
            // Release rate limiting slot
            this._releaseRequestSlot();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATA ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get homework (cahier de textes)
     */
    async getHomework(date = null) {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        let endpoint;
        if (!date) {
            // Get all upcoming homework
            endpoint = `/Eleves/${this.account.id}/cahierdetexte.awp`;
        } else {
            // Get homework for specific date
            endpoint = `/Eleves/${this.account.id}/cahierdetexte/${date}.awp`;
        }

        const data = await this.makeRequest(endpoint, {}, `verbe=get&v=${API_VERSION}`);
        return this.parseHomework(data, date);
    }

    /**
     * Get detailed homework for a range of days
     * @param {number} daysAhead - Number of days to look ahead (default: 7)
     */
    async getHomeworkDetails(daysAhead = 7) {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const today = new Date();
        const allHomework = [];

        // First get the overview to know which dates have homework
        const overview = await this.getHomework();
        const datesWithHomework = new Set(overview.map(h => h.dueDate));

        // Then fetch details for each date within range
        for (let i = 0; i < daysAhead; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            if (datesWithHomework.has(dateStr)) {
                try {
                    const detailed = await this.getHomework(dateStr);
                    allHomework.push(...detailed);
                } catch (err) {
                    console.warn(`Failed to fetch details for ${dateStr}:`, err);
                }
            }
        }

        return allHomework;
    }

    /**
     * Mark homework as done/not done
     */
    async setHomeworkDone(doneIds = [], notDoneIds = []) {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/Eleves/${this.account.id}/cahierdetexte.awp`;
        return await this.makeRequest(endpoint, {
            idDevoirsEffectues: doneIds,
            idDevoirsNonEffectues: notDoneIds,
        }, `verbe=put&v=${API_VERSION}`);
    }

    /**
     * Download a document/file from homework (CDT) or cloud
     * @param {string|number} docId - Document ID
     * @param {string} fileType - Type: 'FICHIER_CDT' (homework), 'CLOUD', 'PIECE_JOINTE' (message), etc.
     * @returns {Promise<Blob>} - The file as a Blob
     */
    async downloadDocument(docId, fileType = 'FICHIER_CDT') {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        // Build the download URL with proper parameters
        const downloadUrl = `${ED_API_BASE}/telechargement.awp?verbe=get&leTypeDeFichier=${fileType}&fichierId=${docId}`;

        try {
            const response = await fetch(downloadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Token': this.token,
                },
                body: `data=${encodeURIComponent(JSON.stringify({ forceDownload: 0 }))}`,
            });

            if (!response.ok) {
                throw new EcoleDirecteError(`Erreur téléchargement: ${response.status}`, response.status);
            }

            // Check content-type to determine if it's a file or JSON error
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                // It's an error response
                const json = await response.json();
                throw new EcoleDirecteError(json.message || 'Erreur téléchargement', json.code || 500);
            }

            // It's a file - return as blob
            return await response.blob();
        } catch (err) {
            console.error('Download failed:', err);
            throw new EcoleDirecteError(`Échec du téléchargement: ${err.message}`, 500);
        }
    }

    /**
     * Get grades
     */
    async getGrades(schoolYear = '') {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/Eleves/${this.account.id}/notes.awp`;
        return await this.makeRequest(endpoint, {
            anneeScolaire: schoolYear,
        }, `verbe=get&v=${API_VERSION}`);
    }

    /**
     * Get schedule/timetable
     */
    async getSchedule(startDate, endDate) {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/E/${this.account.id}/emploidutemps.awp`;
        const data = await this.makeRequest(endpoint, {
            dateDebut: startDate,
            dateFin: endDate,
            avecTrous: false,
        }, `verbe=get&v=${API_VERSION}`);

        return this.parseSchedule(data);
    }

    /**
     * Get school life (absences, delays, etc.)
     */
    async getSchoolLife() {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/eleves/${this.account.id}/viescolaire.awp`;
        return await this.makeRequest(endpoint, {}, `verbe=get&v=${API_VERSION}`);
    }

    /**
     * Get timeline
     */
    async getTimeline() {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/eleves/${this.account.id}/timeline.awp`;
        return await this.makeRequest(endpoint, {}, `verbe=get&v=${API_VERSION}`);
    }

    /**
     * Get administrative documents
     */
    async getDocuments(year = '') {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const endpoint = `/elevesDocuments.awp`;
        return await this.makeRequest(endpoint, {}, `archive=${year}&verbe=get&v=${API_VERSION}`);
    }

    /**
     * Get tests and evaluations (extracted from homework or grades)
     */
    async getTests() {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        // Fetch homework (cahier de texte) as it often contains upcoming tests
        const data = await this.makeRequest(
            `/Eleves/${this.account.id}/cahierdetexte.awp`,
            {},
            `verbe=get&v=${API_VERSION}`
        );

        // Parse specifically for tests using the parser
        return this.parseTests(data);
    }

    /**
     * Get class information
     */
    async getClassInfo() {
        if (!this.account || !this.account.classeId) return null;

        const endpoint = `/classes/${this.account.classeId}/eleves.awp`;
        return await this.makeRequest(endpoint, {}, `verbe=get&v=${API_VERSION}`);
    }

    /**
     * Extract unique teachers from schedule and grades
     * Returns a list of { name, subjects: [{ name, code }] }
     */
    async getMyTeachers() {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const teachersMap = new Map(); // key = teacher name, value = Set of subjects

        try {
            // 1. Get from schedule (current week)
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

            const schedule = await this.getSchedule(
                startOfWeek.toISOString().split('T')[0],
                endOfWeek.toISOString().split('T')[0]
            );

            schedule.forEach(entry => {
                if (entry.teacher && entry.subject) {
                    const teacherName = this.normalizeTeacherName(entry.teacher);
                    if (!teachersMap.has(teacherName)) {
                        teachersMap.set(teacherName, new Map());
                    }
                    const subjects = teachersMap.get(teacherName);
                    subjects.set(entry.subjectCode || entry.subject, {
                        name: entry.subject,
                        code: entry.subjectCode || entry.subject,
                    });
                }
            });
        } catch (err) {
            console.warn('Could not fetch schedule for teachers:', err.message);
        }

        try {
            // 2. Get from grades (more complete list of teachers)
            const grades = await this.getGrades();

            if (grades && grades.periodes) {
                grades.periodes.forEach(periode => {
                    if (periode.ensembleMatieres && periode.ensembleMatieres.disciplines) {
                        periode.ensembleMatieres.disciplines.forEach(discipline => {
                            if (discipline.professeurs) {
                                discipline.professeurs.forEach(prof => {
                                    const teacherName = this.normalizeTeacherName(prof.nom);
                                    if (!teachersMap.has(teacherName)) {
                                        teachersMap.set(teacherName, new Map());
                                    }
                                    const subjects = teachersMap.get(teacherName);
                                    subjects.set(discipline.codeMatiere || discipline.discipline, {
                                        name: discipline.discipline,
                                        code: discipline.codeMatiere || discipline.discipline,
                                    });
                                });
                            }
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('Could not fetch grades for teachers:', err.message);
        }

        // Convert to array format
        const result = [];
        teachersMap.forEach((subjectsMap, teacherName) => {
            result.push({
                name: teacherName,
                subjects: Array.from(subjectsMap.values()),
            });
        });

        console.log(`📚 Found ${result.length} teachers from ED data`);
        return result;
    }

    /**
     * Normalize teacher name for matching
     * "M. DUPONT P." -> "DUPONT"
     * "Mme MARTIN" -> "MARTIN"
     */
    normalizeTeacherName(rawName) {
        if (!rawName) return '';

        // Remove common prefixes
        let name = rawName
            .replace(/^(M\.|Mme|Mlle|Mr\.?|Mrs\.?)\s*/i, '')
            .trim();

        // If it's like "DUPONT P." (lastname + initial), extract lastname
        const parts = name.split(/\s+/);
        if (parts.length >= 1) {
            // Take the first part that looks like a lastname (usually uppercase)
            const lastname = parts.find(p => p.length > 2 && p === p.toUpperCase()) || parts[0];
            return lastname.toUpperCase();
        }

        return name.toUpperCase();
    }

    /**
     * Get messages list (matches EDP implementation)
     * @param {string} type - 'received' (default), 'sent', 'archived', 'draft'
     * @param {number} folderId - Folder ID (0 = inbox, -1 = sent, -2 = archived, -4 = draft)
     */
    async getMessages(type = 'received', folderId = 0) {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        // Get current school year
        const now = new Date();
        const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        const schoolYear = `${year}-${year + 1}`;

        // Build endpoint based on account type (student vs family)
        const accountPath = this.account.type === 'E'
            ? `eleves/${this.account.id}`
            : `familles/${this.account.familyId || this.account.id}`;

        // Handle special folder types
        let typeRecuperation = type;
        let actualFolderId = folderId;

        // Map folderId to type if using negative IDs
        if (folderId === -1) {
            typeRecuperation = 'sent';
            actualFolderId = 0;
        } else if (folderId === -2) {
            typeRecuperation = 'archived';
            actualFolderId = 0;
        } else if (folderId === -4) {
            typeRecuperation = 'draft';
            actualFolderId = 0;
        }

        // Build query string exactly like EDP does
        const queryParams = [
            'force=false',
            `typeRecuperation=${typeRecuperation}`,
            `idClasseur=${actualFolderId}`,
            'orderBy=date',
            'order=desc',
            'query=',
            'onlyRead=',
            'getAll=1',
            'verbe=get',
            `v=${API_VERSION}`
        ].join('&');

        const endpoint = `/${accountPath}/messages.awp`;
        const body = { anneeMessages: schoolYear };

        const data = await this.makeRequest(endpoint, body, queryParams);
        return this.parseMessages(data);
    }

    /**
     * Get message content
     */
    async getMessageContent(messageId, mode = 'destinataire') {
        if (!this.account) throw new EcoleDirecteError('Non authentifié', 401);

        const accountPath = this.account.type === 'E'
            ? `eleves/${this.account.id}`
            : `familles/${this.account.familyId || this.account.id}`;

        const endpoint = `/${accountPath}/messages/${messageId}.awp`;

        console.log(`📨 Fetching content for ${messageId}, mode=${mode}`);

        // Calculate school year (e.g., "2023-2024")
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const schoolYear = currentMonth < 8
            ? `${currentYear - 1}-${currentYear}`
            : `${currentYear}-${currentYear + 1}`;

        const data = await this.makeRequest(endpoint, {
            anneeMessages: schoolYear
        }, `verbe=get&mode=${mode}&v=${API_VERSION}`);

        // Format sender/recipient to avoid [object Object]
        const formatValues = (val) => {
            if (!val) return '';
            if (Array.isArray(val)) return val.map(v => this.formatSender(v)).join(', ');
            return this.formatSender(val);
        };

        return {
            ...data,
            from: formatValues(data.from),
            to: formatValues(data.to),
            content: decodeBase64(data.content || ''),
        };
    }

    /**
     * Download a file attachment
     * @param {number} fileId - File ID
     * @param {string} fileType - Type of file (e.g., 'CLOUD', 'PIECE_JOINTE', 'FICHIER_CDT')
     * @param {string} fileName - Original file name for download
     * @param {object} options - Additional options (e.g., idDevoir for homework files)
     */
    async downloadFile(fileId, fileType, fileName, options = {}) {
        if (!this.token) throw new EcoleDirecteError('Non authentifié', 401);

        const { idDevoir } = options;

        let url = `${ED_API_BASE}/telechargement.awp?verbe=get&fichierId=${fileId}&leTypeDeFichier=${fileType}`;
        if (idDevoir) {
            url += `&idDevoir=${idDevoir}`;
        }

        console.log(`📥 Downloading file: ${fileName} (id=${fileId}, type=${fileType})`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Token': this.token,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'data=' + JSON.stringify({ forceDownload: 0 }),
                referrerPolicy: 'no-referrer',
            });

            if (!response.ok) {
                throw new EcoleDirecteError('Erreur de téléchargement', response.status);
            }

            const blob = await response.blob();

            // Trigger browser download
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);

            return true;
        } catch (error) {
            console.error('Download error:', error);
            throw new EcoleDirecteError('Échec du téléchargement: ' + error.message, 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PARSER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    parseHomework(data, specificDate = null) {
        const homeworkList = [];

        if (specificDate && data.matieres) {
            // Detailed view for specific date
            data.matieres.forEach(item => {
                if (item.aFaire) {
                    homeworkList.push({
                        id: item.aFaire.idDevoir,
                        subject: item.matiere,
                        subjectCode: item.codeMatiere,
                        teacher: item.nomProf,
                        dueDate: specificDate,
                        givenDate: item.aFaire.donneLe,
                        content: decodeBase64(item.aFaire.contenu || ''),
                        done: item.aFaire.effectue || false,
                        type: item.interrogation ? 'test' : 'homework',
                        weight: this.estimateWeight(item),
                        files: item.aFaire.documents || [],
                        sessionContent: item.contenuDeSeance ? decodeBase64(item.contenuDeSeance.contenu) : null,
                    });
                }
            });
        } else if (typeof data === 'object') {
            // Overview of all homework by date
            for (const [date, items] of Object.entries(data)) {
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        homeworkList.push({
                            id: item.idDevoir,
                            subject: item.matiere,
                            subjectCode: item.codeMatiere,
                            dueDate: date,
                            givenDate: item.donneLe,
                            done: item.effectue || false,
                            type: item.interrogation ? 'test' : 'homework',
                            weight: item.interrogation ? 'CONTROL' : 'MEDIUM',
                            hasFiles: item.documentsAFaire || false,
                            files: [], // Files only available in detailed view
                        });
                    });
                }
            }
        }

        return homeworkList;
    }

    parseTests(data) {
        const tests = [];

        if (typeof data === 'object') {
            const processItems = (items, date) => {
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        // Check if it's a test/control or interrogation
                        // Note: item structure depends on if it's from date-specific or global list
                        const isInterrogation = item.interrogation ||
                            (item.contenuDeSeance && item.contenuDeSeance.contenu && decodeBase64(item.contenuDeSeance.contenu).toLowerCase().includes('contrôle')) ||
                            (item.aFaire && item.aFaire.contenu && decodeBase64(item.aFaire.contenu).toLowerCase().includes('contrôle'));

                        if (isInterrogation) {
                            tests.push({
                                id: item.id || item.idDevoir,
                                subject: item.matiere,
                                subjectCode: item.codeMatiere,
                                teacher: item.nomProf,
                                date: item.pourLe || date,
                                content: item.contenuDeSeance ? decodeBase64(item.contenuDeSeance.contenu) : (item.aFaire ? decodeBase64(item.aFaire.contenu) : ''),
                                type: 'test',
                                weight: 'CONTROL',
                            });
                        }
                    });
                }
            };

            if (data.matieres) {
                // Specific date format
                processItems(data.matieres, data.date);
            } else {
                // Global list format
                for (const [date, items] of Object.entries(data)) {
                    processItems(items, date);
                }
            }
        }

        return tests;
    }

    parseSchedule(data) {
        if (!Array.isArray(data)) return [];

        return data.map(entry => ({
            id: entry.id,
            subject: entry.matiere,
            subjectCode: entry.codeMatiere,
            text: entry.text,
            teacher: entry.prof,
            room: entry.salle,
            start: entry.start_date,
            end: entry.end_date,
            canceled: entry.isAnnule || false,
            modified: entry.isModifie || false,
            color: entry.color,
            type: entry.typeCours,
            classe: entry.classe,
            groupe: entry.groupe,
        }));
    }

    parseMessages(data) {
        if (!data || !data.messages) return [];

        const allMessages = [];

        // ED returns data.messages.received, data.messages.sent, etc.
        const messageTypes = ['received', 'sent', 'archived', 'draft'];

        for (const type of messageTypes) {
            const msgArray = data.messages[type];
            if (Array.isArray(msgArray)) {
                msgArray.forEach(msg => {
                    allMessages.push({
                        id: msg.id,
                        subject: msg.subject || '(Sans sujet)',
                        from: this.formatSender(msg.from),
                        to: msg.to ? msg.to.map(t => t.nom || t.prenom).join(', ') : '',
                        date: msg.date,
                        read: msg.read || false,
                        folderId: msg.idClasseur || this.getFolderIdFromType(type),
                        type: type,
                        hasAttachments: Array.isArray(msg.files) && msg.files.length > 0,
                        files: msg.files || [],
                        content: null, // Content loaded separately
                    });
                });
            }
        }

        return allMessages;
    }

    /**
     * Format sender info from ED message
     */
    formatSender(from) {
        if (!from) return 'Inconnu';
        if (typeof from === 'string') return from;
        const parts = [];
        if (from.civilite) parts.push(from.civilite);
        if (from.prenom) parts.push(from.prenom);
        if (from.nom) parts.push(from.nom);
        return parts.join(' ') || from.name || 'Inconnu';
    }

    /**
     * Get folder ID from message type
     */
    getFolderIdFromType(type) {
        switch (type) {
            case 'sent': return -1;
            case 'archived': return -2;
            case 'draft': return -4;
            default: return 0;
        }
    }

    estimateWeight(item) {
        if (item.interrogation) return 'CONTROL';

        const content = decodeBase64(item.aFaire?.contenu || '').toLowerCase();

        if (content.includes('dst') || content.includes('devoir surveillé')) {
            return 'DST';
        }
        if (content.includes('rédaction') || content.includes('dissertation') ||
            content.includes('dm complet') || content.includes('projet')) {
            return 'HEAVY';
        }
        if (content.includes('exercice') || content.includes('relire') ||
            content.includes('réviser') || content.length < 50) {
            return 'LIGHT';
        }

        return 'MEDIUM';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEACHER-SPECIFIC ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get teacher's groups (for teachers only)
     * Endpoint: /v3/P/{profId}/groupes.awp
     */
    async getTeacherGroups() {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        const data = await this.makeRequest(
            `/P/${this.account.id}/groupes.awp`,
            {},
            'verbe=get'
        );

        return (data.groupes || data || []).map(group => ({
            id: group.id,
            code: group.code,
            name: group.libelle,
            type: group.type,
            isFlexible: group.isFlexible,
            isPrimary: group.isPrimaire,
            studentCount: group.nbEleves || 0
        }));
    }

    /**
     * Get students in a specific group
     * Endpoint: /v3/groupes/{groupeId}/eleves.awp
     */
    async getGroupStudents(groupId) {
        if (!this.account) {
            throw new EcoleDirecteError('Non authentifié', 401);
        }

        const data = await this.makeRequest(
            `/groupes/${groupId}/eleves.awp`,
            {},
            'verbe=get'
        );

        return {
            students: (data.eleves || []).map(student => ({
                id: student.id,
                lastName: student.nom,
                firstName: student.prenom,
                particule: student.particule,
                gender: student.sexe,
                classId: student.classeId,
                className: student.classeLibelle,
                groupId: student.groupeId,
                email: student.email,
                phone: student.portable,
                photo: student.photo ? `https:${student.photo}` : null,
                birthDate: student.dateNaissance,
                regime: student.regime,
                badgeNumber: student.numeroBadge,
                isInternship: student.estEnStage,
                isExempt: student.dispense,
                exemptUntil: student.finDispense,
                mandatoryAttendance: student.presenceObligatoire,
                // Special accommodations (PAP, PAI, etc.)
                accommodations: (student.dispositifs || []).map(d => ({
                    id: d.id,
                    name: d.libelle,
                    startDate: d.dateDebut,
                    endDate: d.dateFin
                }))
            })),
            group: data.entity ? {
                id: data.entity.id,
                code: data.entity.code,
                name: data.entity.libelle,
                type: data.entity.type
            } : null
        };
    }

    /**
     * Get teacher's schedule (Emploi du temps)
     * Endpoint: /v3/P/{profId}/emploidutemps.awp
     * @param {string} startDate YYYY-MM-DD
     * @param {string} endDate YYYY-MM-DD
     */
    async getTeacherSchedule(startDate, endDate) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        const data = await this.makeRequest(
            `/P/${this.account.id}/emploidutemps.awp`,
            {
                dateDebut: startDate,
                dateFin: endDate,
                avecTrous: false
            },
            'verbe=get'
        );

        return (data || []).map(event => ({
            id: event.id,
            start: event.start_date,
            end: event.end_date,
            text: event.text, // "1G1 - ANGLAIS"
            color: event.color,
            classId: event.classeId,
            className: event.classe,
            roomId: event.salle,
            subject: event.matiere,
            type: event.type, // "COURS", etc.
            isCancelled: event.isAnnule,
            icon: event.icon
        }));
    }

    /**
     * Get teacher's textbook assignments (Devoirs donnés)
     * Note: This usually requires a specific date or class ID in ED.
     * We'll try to fetch recent homeworks.
     * Endpoint: /v3/P/{profId}/cahierdetexte.awp (This returns the general structure)
     */
    async getTeacherWork(date) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        // Note: The correct endpoint for fetching detailed homework list directly 
        // without going through schedule might vary.
        // We will try fetching the schedule first, then check if we can get details.
        // For now, let's assume we want the schedule which maps to homework.

        // Use makeRequest to try generic endpoint if specific one unknown
        // or rely on getting schedule and assuming 'text' contains info?
        // No, 'text' is just title.

        // This is a placeholder for the actual implementation once we confirm the endpoint.
        // For now, getting the schedule is the most reliable way to visually represent "slots" where homework is.
        return [];
    }

    /**
     * Get teacher's textbook slots (Schedule + Homework)
     * Endpoint: /v3/cahierdetexte/loadslots/{start}/{end}.awp
     * Returns minimal schedule info AND homework details.
     */
    async getTeacherTextbookSlots(startDate, endDate) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        console.log(`🔍 Fetching Textbook Slots from ${startDate} to ${endDate}...`);

        try {
            // Note: Does not require Prof ID in URL, uses token context
            const data = await this.makeRequest(
                `/cahierdetexte/loadslots/${startDate}/${endDate}.awp`,
                {},
                'verbe=get'
            );

            // Map to a cleaner format
            return (data || []).map(slot => ({
                id: slot.idCours,
                idCdt: slot.idCDT, // Can be used for updates
                start: slot.start_date,
                end: slot.end_date,
                date: slot.date,

                // Display info
                subject: slot.matiereLibelle || slot.matiereCode,
                className: slot.entityLibelle || slot.entityCode,
                room: slot.salle,
                color: slot.color,

                // Homework info
                hasHomework: slot.travailAFaire,
                homework: slot.aFaire ? {
                    dateAssigned: slot.aFaire.donneLe,
                    dateDue: slot.date, // It's due for this slot
                    content: slot.aFaire.contenu, // BASE64 ENCODED!
                    documents: (slot.aFaire.documents || []).map(doc => ({
                        id: doc.id,
                        name: doc.libelle,
                        url: '', // Need specific endpoint for docs usually
                        type: doc.type
                    }))
                } : null,

                raw: slot // Keep raw data just in case
            }));
        } catch (e) {
            console.warn('⚠️ Textbook slots fetch failed:', e);
            return [];
        }
    }

    /**
     * Get grades/evaluations for a group
     * Endpoint: /v3/enseignants/{idProf}/G/{idGroupe}/periodes/{idPeriode}/matieres/{codeMatiere}/notes.awp
     */
    async getTeacherGrades(groupId, periodCode = 'A001', subjectCode = 'ARA3') {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        console.log(`🔍 Fetching Grades for G:${groupId} P:${periodCode} S:${subjectCode}...`);

        try {
            // Handle special chars in subject code just in case
            const encodedSubject = encodeURIComponent(subjectCode);

            const data = await this.makeRequest(
                `/enseignants/${this.account.id}/G/${groupId}/periodes/${periodCode}/matieres/${encodedSubject}/notes.awp`,
                {},
                'verbe=get'
            );
            return data;
        } catch (e) {
            console.warn('⚠️ Grades fetch failed:', e);
            throw e;
        }
    }

    /**
     * Download a file (Textbook or Mail attachment)
     * Handles auth headers and triggers download in browser
     */
    async downloadAttachment(fileId, fileType = 'FICHIER_CDT', fileName = 'document.pdf') {
        if (!this.isAuthenticated()) {
            throw new EcoleDirecteError('Non authentifié', 401);
        }

        console.log(`📥 Downloading file ${fileId} (${fileType})...`);

        try {
            // We use fetch manually to handle Blob response
            const url = `${ED_API_BASE}/telechargement.awp?verbe=get&fichierId=${fileId}&leTypeDeFichier=${fileType}`;

            const response = await fetch(url, {
                method: 'GET', // Downloads are usually GET with token in header or cookie
                headers: {
                    'X-Token': this.token
                }
            });

            if (!response.ok) throw new Error(`Download failed: ${response.status}`);

            const blob = await response.blob();

            // Create object URL and trigger download
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName; // Set the file name
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            return true;
        } catch (e) {
            console.error('Download error:', e);
            throw e;
        }
    }

    async getAllTeacherStudents(forceRefresh = false) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        const CACHE_KEY = 'ed_teacher_students_cache';
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

        // 1. Try to load from CACHE first (Stealth Mode)
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { timestamp, data } = JSON.parse(cached);
                    const age = Date.now() - timestamp;

                    if (age < CACHE_DURATION && Array.isArray(data) && data.length > 0) {
                        console.log(`🥷 STEALTH MODE: Loaded ${data.length} students from local cache (Age: ${Math.round(age / 1000 / 60)}min). No API call made.`);
                        return data;
                    }
                }
            } catch (e) {
                console.warn('Cache read error', e);
            }
        }

        // 2. If not in cache, fetch gently
        const groupIds = [...new Set(
            (this.account.classes || []).map(c => c.idGroupe).filter(Boolean)
        )];

        console.log('📋 Found', groupIds.length, 'unique groups to fetch.');
        const allStudents = new Map();

        for (const groupId of groupIds) {
            try {
                // THROTTLING: Wait random time between requests to avoid IP Ban
                const delay = Math.floor(Math.random() * 800) + 500; // 500ms - 1300ms
                await new Promise(r => setTimeout(r, delay));

                console.log(`📥 Fetching students for group ${groupId}... (Wait: ${delay}ms)`);
                const { students, group } = await this.getGroupStudents(groupId);

                for (const student of students) {
                    if (!allStudents.has(student.id)) {
                        allStudents.set(student.id, { ...student, groups: [group] });
                    } else {
                        allStudents.get(student.id).groups.push(group);
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch students for group ${groupId}:`, err.message);
            }
        }

        const resultArray = Array.from(allStudents.values());

        // 3. Save to CACHE
        if (resultArray.length > 0) {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: resultArray
                }));
                console.log('💾 Data cached locally for 24h.');
            } catch (e) {
                console.error('Failed to save cache (quota exceeded?)', e);
            }
        }

        console.log(`✅ Total unique students: ${allStudents.size}`);
        return resultArray;
    }

    /**
     * Get teacher's groups from account data (no API call needed)
     * Returns the groups already loaded during login
     */
    getTeacherGroupsFromAccount() {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        // Extract unique groups from classes
        const groupMap = new Map();
        for (const cls of (this.account.classes || [])) {
            if (cls.idGroupe && !groupMap.has(cls.idGroupe)) {
                groupMap.set(cls.idGroupe, {
                    id: cls.idGroupe,
                    classes: []
                });
            }
            if (cls.idGroupe) {
                groupMap.get(cls.idGroupe).classes.push({
                    id: cls.id,
                    code: cls.code,
                    name: cls.libelle
                });
            }
        }

        return Array.from(groupMap.values());
    }

    /**
     * Get teacher's classes (distinct from groups)
     * Endpoint: /v3/P/{profId}/classes.awp
     */
    async getTeacherClasses() {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Cette méthode est réservée aux professeurs', 403);
        }

        const data = await this.makeRequest(
            `/P/${this.account.id}/classes.awp`,
            {},
            'verbe=get'
        );

        return (data.classes || data || []).map(cls => ({
            id: cls.id,
            code: cls.code,
            name: cls.libelle,
            level: cls.niveau,
            studentCount: cls.nbEleves || 0
        }));
    }

    /**
     * Get students in a specific class
     * Endpoint: /v3/classes/{classeId}/eleves.awp
     */
    async getClassStudents(classId) {
        if (!this.account) {
            throw new EcoleDirecteError('Non authentifié', 401);
        }

        const data = await this.makeRequest(
            `/classes/${classId}/eleves.awp`,
            {},
            'verbe=get'
        );

        return {
            students: (data.eleves || []).map(student => ({
                id: student.id,
                lastName: student.nom,
                firstName: student.prenom,
                particule: student.particule,
                gender: student.sexe,
                classId: student.classeId,
                className: student.classeLibelle,
                email: student.email,
                phone: student.portable,
                photo: student.photo ? `https:${student.photo}` : null,
                birthDate: student.dateNaissance,
                regime: student.regime,
                accommodations: (student.dispositifs || []).map(d => ({
                    id: d.id,
                    name: d.libelle,
                    startDate: d.dateDebut,
                    endDate: d.dateFin
                }))
            })),
            class: data.entity ? {
                id: data.entity.id,
                code: data.entity.code,
                name: data.entity.libelle
            } : null
        };
    }

    /**
     * Get Teacher Messages (Inbox)
     * Endpoint: /v3/enseignants/{id}/messages.awp?verbe=getall
     */
    async getTeacherMessages() {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Réservé aux professeurs', 403);
        }

        console.log('📬 Fetching Teacher Messages...');
        try {
            // Using parameters observed in logs
            const queryParams = new URLSearchParams({
                force: 'false',
                typeRecuperation: 'received',
                idClasseur: '0',
                orderBy: 'date',
                order: 'desc',
                page: '0',
                itemsPerPage: '100',
                getAll: '0',
                verbe: 'get'
            }).toString();

            const data = await this.makeRequest(
                `/enseignants/${this.account.id}/messages.awp`,
                {},
                queryParams
            );

            // Normalize return to expected structure in UI
            // API returns { messages: { received: [...] } }
            // UI expects { messages: { recus: [...] } } or we change UI.
            // Let's create a normalized object
            return {
                messages: {
                    recus: data.messages?.received || [],
                    envoyes: data.messages?.sent || []
                },
                pagination: data.pagination
            };
        } catch (e) {
            console.warn('⚠️ Messages fetch failed:', e);
            throw e;
        }
    }

    /**
     * Get Message Content
     * Endpoint: /v3/enseignants/{id}/messages/{messageId}.awp?verbe=get
     */
    async getTeacherMessageContent(messageId) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Réservé aux professeurs', 403);
        }

        try {
            // FIX: ID in path AND parameters in query string
            const data = await this.makeRequest(
                `/enseignants/${this.account.id}/messages/${messageId}.awp`,
                {},
                `verbe=get&mode=destinataire`
            );

            return {
                content: data.content,
                files: data.files || []
            };
        } catch (e) {
            console.warn('⚠️ Message content fetch failed:', e);
            throw e;
        }
    }

    /**
     * Get Student Vie Scolaire (Absences, Sanctions)
     * Endpoint: /v3/eleves/{idEleve}/viescolaire.awp?verbe=get
     */
    async getStudentVieScolaire(studentId) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Réservé aux professeurs', 403);
        }

        try {
            const data = await this.makeRequest(
                `/eleves/${studentId}/viescolaire.awp`,
                {},
                'verbe=get'
            );
            return data;
        } catch (e) {
            console.warn(`⚠️ Vie Scolaire fetch failed for student ${studentId}:`, e);
            // Return empty structure to avoid crashing UI
            return { absencesRetards: [], sanctionsEncouragements: [] };
        }
    }

    /**
     * Get Student Carnet de Correspondance
     * Endpoint: /v3/eleves/{idEleve}/eleveCarnetCorrespondance.awp?verbe=get
     */
    async getStudentCarnet(studentId) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Réservé aux professeurs', 403);
        }

        try {
            const data = await this.makeRequest(
                `/eleves/${studentId}/eleveCarnetCorrespondance.awp`,
                {},
                'verbe=get'
            );
            return data;
        } catch (e) {
            console.warn(`⚠️ Carnet fetch failed for student ${studentId}:`, e);
            return { correspondances: [] };
        }
    }

    /**
     * Get Student Grades/Notes
     * Endpoint: /v3/eleves/{idEleve}/notes.awp?verbe=get
     */
    async getStudentGrades(studentId) {
        if (!this.account || this.account.type !== 'P') {
            throw new EcoleDirecteError('Réservé aux professeurs', 403);
        }

        try {
            const data = await this.makeRequest(
                `/eleves/${studentId}/notes.awp`,
                {},
                'verbe=get'
            );
            return data;
        } catch (e) {
            console.warn(`⚠️ Grades fetch failed for student ${studentId}:`, e);
            return { periodes: [], notes: [] };
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const realEcoleDirecteClient = new RealEcoleDirecteClient();

// Expose to window in dev mode for console testing
if (import.meta.env.DEV) {
    window.edClient = realEcoleDirecteClient;
    console.log('🔧 DEV: edClient exposed on window. Try: edClient.getTeacherGroups()');
}

export default realEcoleDirecteClient;
