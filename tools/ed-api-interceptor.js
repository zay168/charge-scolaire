/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 ÉCOLE DIRECTE API INTERCEPTOR - ULTIMATE MITM SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * USAGE:
 * 1. Ouvre https://www.ecoledirecte.com dans Chrome/Edge
 * 2. Ouvre la console (F12 → Console)
 * 3. Copie-colle TOUT ce script et appuie sur Entrée
 * 4. Navigue sur TOUTES les pages d'ED (emploi du temps, notes, devoirs, messages, cloud, etc.)
 * 5. Quand tu as fini, tape: ED_EXPORT() et copie le résultat
 * 
 * COMMANDES DISPONIBLES:
 *   ED_EXPORT()     → Exporte toutes les données capturées en JSON
 *   ED_STATS()      → Affiche les statistiques de capture
 *   ED_CLEAR()      → Efface toutes les données capturées
 *   ED_ENDPOINTS()  → Liste tous les endpoints découverts
 *   ED_SCHEMA()     → Génère un schéma TypeScript des réponses
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════

    const ED_CAPTURE = {
        version: '2.0.0',
        startTime: new Date().toISOString(),
        endpoints: {},      // Grouped by endpoint path
        requests: [],       // All requests chronologically
        cookies: {},        // Captured cookies
        tokens: {},         // Captured tokens (X-Token, GTK, etc.)
        errors: [],         // Failed requests
        stats: {
            totalRequests: 0,
            totalBytes: 0,
            uniqueEndpoints: 0,
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════

    const parseBody = (body) => {
        if (!body) return null;
        if (typeof body === 'string') {
            // ED uses data=JSON format
            if (body.startsWith('data=')) {
                try {
                    const decoded = decodeURIComponent(body.slice(5));
                    return JSON.parse(decoded);
                } catch (e) {
                    return body;
                }
            }
            try {
                return JSON.parse(body);
            } catch (e) {
                return body;
            }
        }
        return body;
    };

    const extractEndpoint = (url) => {
        try {
            const u = new URL(url);
            return u.pathname.replace(/\/v3\/?/, '').replace(/\d+/g, '{id}');
        } catch (e) {
            return url;
        }
    };

    const formatBytes = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const deepMergeSchema = (existing, newData) => {
        if (!existing) return getSchema(newData);
        // Simplified - just return newData schema for now
        return getSchema(newData);
    };

    const getSchema = (obj, depth = 0) => {
        if (depth > 5) return '...';
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            return [getSchema(obj[0], depth + 1)];
        }
        if (typeof obj === 'object') {
            const schema = {};
            for (const [key, value] of Object.entries(obj)) {
                schema[key] = getSchema(value, depth + 1);
            }
            return schema;
        }
        return typeof obj;
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CAPTURE FUNCTION
    // ═══════════════════════════════════════════════════════════════════════

    const captureRequest = (url, method, requestHeaders, requestBody, responseStatus, responseHeaders, responseBody, duration) => {
        const endpoint = extractEndpoint(url);
        const timestamp = new Date().toISOString();

        // Parse bodies
        const parsedRequestBody = parseBody(requestBody);
        let parsedResponseBody = responseBody;
        try {
            parsedResponseBody = JSON.parse(responseBody);
        } catch (e) {
            // Keep as string if not JSON
        }

        // Extract tokens
        if (responseHeaders) {
            const xToken = responseHeaders.get?.('x-token') || responseHeaders['x-token'];
            const gtk = responseHeaders.get?.('x-gtk') || responseHeaders['x-gtk'];
            const twoFA = responseHeaders.get?.('2fa-token') || responseHeaders['2fa-token'];

            if (xToken) ED_CAPTURE.tokens['X-Token'] = xToken;
            if (gtk) ED_CAPTURE.tokens['GTK'] = gtk;
            if (twoFA) ED_CAPTURE.tokens['2FA-Token'] = twoFA;
        }

        // Create request record
        const record = {
            id: ED_CAPTURE.stats.totalRequests++,
            timestamp,
            endpoint,
            url,
            method,
            duration: duration + 'ms',
            request: {
                headers: Object.fromEntries(requestHeaders?.entries?.() || []),
                body: parsedRequestBody,
            },
            response: {
                status: responseStatus,
                headers: Object.fromEntries(responseHeaders?.entries?.() || []),
                body: parsedResponseBody,
                size: typeof responseBody === 'string' ? responseBody.length : 0,
            }
        };

        // Add to chronological list
        ED_CAPTURE.requests.push(record);

        // Group by endpoint
        if (!ED_CAPTURE.endpoints[endpoint]) {
            ED_CAPTURE.endpoints[endpoint] = {
                path: endpoint,
                method,
                sampleRequest: parsedRequestBody,
                sampleResponse: parsedResponseBody,
                responseSchema: getSchema(parsedResponseBody),
                calls: [],
            };
            ED_CAPTURE.stats.uniqueEndpoints++;
        }
        ED_CAPTURE.endpoints[endpoint].calls.push({
            timestamp,
            status: responseStatus,
            duration,
        });

        // Update stats
        ED_CAPTURE.stats.totalBytes += record.response.size;

        // Console output
        const statusColor = responseStatus >= 200 && responseStatus < 300 ? '#4CAF50' : '#F44336';
        console.log(
            `%c[ED-MITM]%c ${method} %c${endpoint}%c → %c${responseStatus}%c (${duration}ms)`,
            'background:#673AB7;color:white;padding:2px 6px;border-radius:3px;',
            'color:#888;',
            'color:#2196F3;font-weight:bold;',
            'color:#888;',
            `background:${statusColor};color:white;padding:1px 4px;border-radius:2px;`,
            'color:#888;'
        );

        return record;
    };

    // ═══════════════════════════════════════════════════════════════════════
    // INTERCEPT FETCH
    // ═══════════════════════════════════════════════════════════════════════

    const originalFetch = window.fetch;
    window.fetch = async function (input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;

        // Only intercept ED API calls
        if (!url.includes('ecoledirecte.com') && !url.includes('/api/ed')) {
            return originalFetch.apply(this, arguments);
        }

        const method = init.method || 'GET';
        const requestHeaders = new Headers(init.headers || {});
        const requestBody = init.body;
        const startTime = performance.now();

        try {
            const response = await originalFetch.apply(this, arguments);
            const duration = Math.round(performance.now() - startTime);

            // Clone to read body without consuming
            const clone = response.clone();
            const responseBody = await clone.text();

            captureRequest(
                url,
                method,
                requestHeaders,
                requestBody,
                response.status,
                response.headers,
                responseBody,
                duration
            );

            return response;
        } catch (error) {
            ED_CAPTURE.errors.push({
                timestamp: new Date().toISOString(),
                url,
                method,
                error: error.message,
            });
            throw error;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // INTERCEPT XMLHttpRequest
    // ═══════════════════════════════════════════════════════════════════════

    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._edUrl = url;
        this._edMethod = method;
        this._edHeaders = {};
        this._edStartTime = null;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (this._edHeaders) {
            this._edHeaders[name] = value;
        }
        return originalXHRSetHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        const url = this._edUrl;

        if (url && (url.includes('ecoledirecte.com') || url.includes('/api/ed'))) {
            this._edStartTime = performance.now();
            this._edBody = body;

            this.addEventListener('load', function () {
                const duration = Math.round(performance.now() - this._edStartTime);

                const responseHeaders = {};
                this.getAllResponseHeaders().split('\r\n').forEach(line => {
                    const [key, value] = line.split(': ');
                    if (key) responseHeaders[key.toLowerCase()] = value;
                });

                captureRequest(
                    url,
                    this._edMethod,
                    new Headers(this._edHeaders),
                    this._edBody,
                    this.status,
                    new Headers(responseHeaders),
                    this.responseText,
                    duration
                );
            });
        }

        return originalXHRSend.apply(this, arguments);
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CAPTURE COOKIES
    // ═══════════════════════════════════════════════════════════════════════

    const captureCookies = () => {
        document.cookie.split(';').forEach(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            if (name) {
                ED_CAPTURE.cookies[name] = valueParts.join('=');
            }
        });
    };

    // Capture cookies periodically
    setInterval(captureCookies, 2000);
    captureCookies();

    // ═══════════════════════════════════════════════════════════════════════
    // GLOBAL COMMANDS
    // ═══════════════════════════════════════════════════════════════════════

    window.ED_EXPORT = () => {
        const data = {
            ...ED_CAPTURE,
            exportTime: new Date().toISOString(),
        };
        const json = JSON.stringify(data, null, 2);

        // Copy to clipboard
        navigator.clipboard.writeText(json).then(() => {
            console.log('%c✅ Données copiées dans le presse-papier!', 'color:#4CAF50;font-weight:bold;font-size:14px;');
        }).catch(() => {
            console.log('%c📋 Copie manuelle requise (voir ci-dessous)', 'color:#FF9800;');
        });

        // Also download as file
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ed-api-capture-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('%c📁 Fichier JSON téléchargé!', 'color:#4CAF50;font-weight:bold;');
        return data;
    };

    window.ED_STATS = () => {
        console.log('%c═══════════════════════════════════════', 'color:#673AB7;');
        console.log('%c📊 STATISTIQUES DE CAPTURE', 'color:#673AB7;font-weight:bold;font-size:14px;');
        console.log('%c═══════════════════════════════════════', 'color:#673AB7;');
        console.log(`📡 Requêtes capturées: ${ED_CAPTURE.stats.totalRequests}`);
        console.log(`🔗 Endpoints uniques: ${ED_CAPTURE.stats.uniqueEndpoints}`);
        console.log(`💾 Données totales: ${formatBytes(ED_CAPTURE.stats.totalBytes)}`);
        console.log(`❌ Erreurs: ${ED_CAPTURE.errors.length}`);
        console.log(`🍪 Cookies: ${Object.keys(ED_CAPTURE.cookies).join(', ')}`);
        console.log(`🔑 Tokens: ${Object.keys(ED_CAPTURE.tokens).join(', ')}`);
        return ED_CAPTURE.stats;
    };

    window.ED_ENDPOINTS = () => {
        console.log('%c═══════════════════════════════════════', 'color:#2196F3;');
        console.log('%c🔗 ENDPOINTS DÉCOUVERTS', 'color:#2196F3;font-weight:bold;font-size:14px;');
        console.log('%c═══════════════════════════════════════', 'color:#2196F3;');

        Object.entries(ED_CAPTURE.endpoints).forEach(([path, data]) => {
            console.log(`%c${data.method}%c ${path} %c(${data.calls.length} appels)`,
                'background:#4CAF50;color:white;padding:1px 4px;border-radius:2px;',
                'color:#2196F3;font-weight:bold;',
                'color:#888;'
            );
        });

        return Object.keys(ED_CAPTURE.endpoints);
    };

    window.ED_SCHEMA = () => {
        console.log('%c═══════════════════════════════════════', 'color:#FF9800;');
        console.log('%c📐 SCHÉMAS DE RÉPONSE', 'color:#FF9800;font-weight:bold;font-size:14px;');
        console.log('%c═══════════════════════════════════════', 'color:#FF9800;');

        const schemas = {};
        Object.entries(ED_CAPTURE.endpoints).forEach(([path, data]) => {
            schemas[path] = data.responseSchema;
            console.log(`\n%c${path}:`, 'color:#FF9800;font-weight:bold;');
            console.log(data.responseSchema);
        });

        return schemas;
    };

    window.ED_CLEAR = () => {
        ED_CAPTURE.requests = [];
        ED_CAPTURE.endpoints = {};
        ED_CAPTURE.errors = [];
        ED_CAPTURE.stats = { totalRequests: 0, totalBytes: 0, uniqueEndpoints: 0 };
        console.log('%c🗑️ Données effacées!', 'color:#F44336;font-weight:bold;');
    };

    window.ED_CAPTURE = ED_CAPTURE;

    // ═══════════════════════════════════════════════════════════════════════
    // STARTUP MESSAGE
    // ═══════════════════════════════════════════════════════════════════════

    console.clear();
    console.log('%c═══════════════════════════════════════════════════════════════', 'color:#673AB7;');
    console.log('%c🔍 ÉCOLE DIRECTE API INTERCEPTOR v2.0', 'color:#673AB7;font-weight:bold;font-size:18px;');
    console.log('%c═══════════════════════════════════════════════════════════════', 'color:#673AB7;');
    console.log('%c✅ Interception active!', 'color:#4CAF50;font-weight:bold;');
    console.log('%c📌 Navigue sur toutes les pages ED pour capturer les appels API', 'color:#2196F3;');
    console.log('');
    console.log('%cCommandes disponibles:', 'color:#888;font-weight:bold;');
    console.log('  %cED_EXPORT()%c   → Exporter en JSON + télécharger', 'color:#FF9800;', 'color:#888;');
    console.log('  %cED_STATS()%c    → Voir les statistiques', 'color:#FF9800;', 'color:#888;');
    console.log('  %cED_ENDPOINTS()%c→ Lister les endpoints', 'color:#FF9800;', 'color:#888;');
    console.log('  %cED_SCHEMA()%c   → Voir les schémas de données', 'color:#FF9800;', 'color:#888;');
    console.log('  %cED_CLEAR()%c    → Effacer les données', 'color:#FF9800;', 'color:#888;');
    console.log('%c═══════════════════════════════════════════════════════════════', 'color:#673AB7;');

})();
