/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API CLIENT CONFIGURATION
 * Switch between mock and real École Directe API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * API modes available:
 * - 'mock': Uses mock data (for development/demo)
 * - 'real': Uses real École Directe API (requires proxy or extension)
 * - 'auto': Uses real in production, mock in development
 */
export const API_MODE = import.meta.env.VITE_API_MODE || 'mock';

/**
 * Use real API in development?
 * Set VITE_USE_REAL_API=true in .env to enable
 */
export const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true';

/**
 * Check if running in Electron
 */
export const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

/**
 * École Directe API base URL
 * - Electron: Direct API (main.cjs handles GTK cookies via webRequest)
 * - Web Production: Railway backend (handles sessions)
 * - Development: Vite proxy
 */
export const ED_API_BASE = isElectron
    ? 'https://api.ecoledirecte.com/v3'
    : (import.meta.env.PROD
        ? 'https://charge-scolaire-production.up.railway.app/api/ed'
        : (import.meta.env.VITE_API_URL || '/api/ed'));

/**
 * API Version (from École Directe)
 */
export const API_VERSION = '4.69.1';

/**
 * Get required headers for direct API calls in Electron
 * These headers are normally handled by the proxy or extension
 */
export function getElectronHeaders() {
    if (!isElectron) return {};

    return {
        'Origin': 'https://www.ecoledirecte.com',
        'Referer': 'https://www.ecoledirecte.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
}

/**
 * Determine which client to use
 */
export function getApiMode() {
    if (API_MODE === 'real' || USE_REAL_API) {
        return 'real';
    }
    if (API_MODE === 'auto') {
        return import.meta.env.PROD ? 'real' : 'mock';
    }
    return 'mock';
}

export default {
    API_MODE,
    USE_REAL_API,
    ED_API_BASE,
    API_VERSION,
    isElectron,
    getElectronHeaders,
    getApiMode,
};
