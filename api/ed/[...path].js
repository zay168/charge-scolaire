/**
 * Vercel Serverless Function - École Directe Proxy
 * Route: /api/ed/[...path]
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Token');
    res.setHeader('Access-Control-Expose-Headers', 'X-GTK-Token, X-2FA-Token');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Get the path from the URL
        const { path } = req.query;
        const apiPath = Array.isArray(path) ? path.join('/') : path || '';

        if (!apiPath) {
            return res.status(400).json({ error: 'Missing API path' });
        }

        // Build target URL with query params
        const url = new URL(req.url, `https://${req.headers.host}`);
        const queryString = url.search || '';
        const targetUrl = `https://api.ecoledirecte.com/v3/${apiPath}${queryString}`;

        console.log(`[Proxy] ${req.method} ${targetUrl}`);

        // Build headers
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.ecoledirecte.com',
            'Referer': 'https://www.ecoledirecte.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        // Forward X-Token
        if (req.headers['x-token']) {
            headers['X-Token'] = req.headers['x-token'];
        }

        // Forward cookies
        if (req.headers.cookie) {
            headers['Cookie'] = req.headers.cookie;
        }

        // Get body for POST
        let body = undefined;
        if (req.method === 'POST') {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        // Make request to École Directe
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body,
        });

        // Get response
        const data = await response.text();

        // Forward Set-Cookie and extract GTK
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            const gtkMatch = setCookie.match(/GTK=([^;]+)/);
            if (gtkMatch) {
                res.setHeader('X-GTK-Token', gtkMatch[1]);
            }
        }

        // Forward 2FA token
        const token2fa = response.headers.get('2fa-token');
        if (token2fa) {
            res.setHeader('X-2FA-Token', token2fa);
        }

        // Send response
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(data);

    } catch (error) {
        console.error('[Proxy Error]', error);
        return res.status(500).json({
            error: error.message,
            code: 500
        });
    }
}
