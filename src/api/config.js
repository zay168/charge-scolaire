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
 * École Directe API base URL
 * In development, this goes through Vite's proxy
 * In production, you need your own proxy server
 */
export const ED_API_BASE = import.meta.env.DEV
    ? '/api/ed'
    : (import.meta.env.VITE_PROXY_URL || 'https://api.ecoledirecte.com/v3');

/**
 * API Version (from École Directe)
 */
export const API_VERSION = '4.69.1';

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
    getApiMode,
};
