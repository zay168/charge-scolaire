/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROXY SERVER FOR ECOLE DIRECTE API
 * Based on Ecole-Directe-Plus implementation
 * 
 * This server bypasses CORS restrictions by proxying requests to EcoleDirecte.
 * 
 * Usage:
 *   node server/proxy.js
 * 
 * Then configure your API client to use http://localhost:3000/proxy?url=...
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;
const HOST = 'localhost';

// Enable CORS for all origins (development only)
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.text({ type: 'application/x-www-form-urlencoded' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

/**
 * Main proxy endpoint
 * Usage: /api/proxy?url=https://api.ecoledirecte.com/v3/login.awp
 */
app.all('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        console.log(`→ Proxying to: ${targetUrl}`);

        // Forward the request to EcoleDirecte
        const proxyResponse = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.ecoledirecte.com',
                'Referer': 'https://www.ecoledirecte.com/',
                'X-Token': req.headers['x-token'] || '',
                '2FA-Token': req.headers['2fa-token'] || '',
            },
            body: req.method !== 'GET' ? req.body : undefined,
        });

        // Get response data
        const data = await proxyResponse.text();

        // Forward important headers
        const xToken = proxyResponse.headers.get('x-token');
        const token2fa = proxyResponse.headers.get('2fa-token');

        if (xToken) {
            res.setHeader('x-token', xToken);
        }
        if (token2fa) {
            res.setHeader('2fa-token', token2fa);
        }

        // Send response
        res.setHeader('Content-Type', 'application/json');
        res.status(proxyResponse.status).send(data);

        console.log(`← Response: ${proxyResponse.status}`);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

/**
 * Direct API endpoints (alternative to query param)
 * Usage: /api/ed/login.awp
 */
app.all('/api/ed/*', async (req, res) => {
    const path = req.params[0];
    const targetUrl = `https://api.ecoledirecte.com/v3/${path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;

    try {
        console.log(`→ Proxying to: ${targetUrl}`);

        const proxyResponse = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.ecoledirecte.com',
                'Referer': 'https://www.ecoledirecte.com/',
                'X-Token': req.headers['x-token'] || '',
                '2FA-Token': req.headers['2fa-token'] || '',
            },
            body: req.method !== 'GET' ? req.body : undefined,
        });

        const data = await proxyResponse.text();

        const xToken = proxyResponse.headers.get('x-token');
        const token2fa = proxyResponse.headers.get('2fa-token');

        if (xToken) res.setHeader('x-token', xToken);
        if (token2fa) res.setHeader('2fa-token', token2fa);

        res.setHeader('Content-Type', 'application/json');
        res.status(proxyResponse.status).send(data);

        console.log(`← Response: ${proxyResponse.status}`);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy error', message: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ECOLE DIRECTE PROXY SERVER                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at http://${HOST}:${PORT}                       ║
║                                                               ║
║  Endpoints:                                                   ║
║  • /api/proxy?url=<ecole-directe-url>                        ║
║  • /api/ed/<path>  (e.g., /api/ed/login.awp)                 ║
║  • /health                                                   ║
╚═══════════════════════════════════════════════════════════════╝
`);
});
