/**
 * Backend Express pour École Directe
 * Gère la session et le proxy vers l'API ED
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// Session storage (in production, use Redis)
const sessions = new Map();

app.use(cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['X-Session-Id', 'X-Token', '2FA-Token']
}));

app.use(express.text({ type: '*/*' }));

// Generate session ID
function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get or create session
function getSession(req) {
    let sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
        sessionId = generateSessionId();
        sessions.set(sessionId, { cookies: [], gtkToken: null });
    }
    return { sessionId, session: sessions.get(sessionId) };
}

// Proxy endpoint
app.all('/api/ed/*', async (req, res) => {
    try {
        const { sessionId, session } = getSession(req);

        // Extract path
        const apiPath = req.path.replace('/api/ed/', '');
        const queryString = new URL(req.url, `http://${req.headers.host}`).search;
        const targetUrl = `https://api.ecoledirecte.com/v3/${apiPath}${queryString}`;

        console.log(`[Proxy] ${req.method} ${targetUrl}`);

        // Build headers
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.ecoledirecte.com',
            'Referer': 'https://www.ecoledirecte.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        // Add session cookies
        if (session.cookies.length > 0) {
            headers['Cookie'] = session.cookies.join('; ');
        }

        // Add GTK header if we have it
        if (session.gtkToken) {
            headers['X-GTK'] = session.gtkToken;
        }

        // Forward X-Token
        if (req.headers['x-token']) {
            headers['X-Token'] = req.headers['x-token'];
        }

        // Forward 2FA-Token (crucial for QCM)
        if (req.headers['2fa-token']) {
            headers['2FA-Token'] = req.headers['2fa-token'];
        }

        // Make request
        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body: req.method === 'POST' ? req.body : undefined,
        });

        // Capture cookies from response
        const setCookies = response.headers.raw()['set-cookie'] || [];
        for (const cookie of setCookies) {
            const cookieValue = cookie.split(';')[0];
            const [name] = cookieValue.split('=');

            // Update or add cookie
            const idx = session.cookies.findIndex(c => c.startsWith(name + '='));
            if (idx >= 0) {
                session.cookies[idx] = cookieValue;
            } else {
                session.cookies.push(cookieValue);
            }

            // Extract GTK
            if (name === 'GTK') {
                session.gtkToken = cookieValue.split('=')[1];
                console.log('[Proxy] GTK captured:', session.gtkToken.substring(0, 20) + '...');
            }
        }

        // Get response
        const data = await response.text();

        // Send response with session ID
        res.setHeader('X-Session-Id', sessionId);
        res.setHeader('Content-Type', 'application/json');

        // Forward token headers from ED response to client
        const xToken = response.headers.get('x-token');
        const token2fa = response.headers.get('2fa-token');
        if (xToken) res.setHeader('X-Token', xToken);
        if (token2fa) res.setHeader('2FA-Token', token2fa);

        res.status(response.status).send(data);

    } catch (error) {
        console.error('[Proxy Error]', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ED Proxy server running on port ${PORT}`);
});
