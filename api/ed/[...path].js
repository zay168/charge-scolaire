/**
 * Vercel Serverless Function - École Directe Proxy
 * This bypasses CORS by making requests server-side
 * 
 * Route: /api/ed/[...path]
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const url = new URL(request.url);

    // Extract the path after /api/ed/
    const pathMatch = url.pathname.match(/^\/api\/ed\/(.*)$/);
    const apiPath = pathMatch ? pathMatch[1] : '';

    if (!apiPath) {
        return new Response(JSON.stringify({ error: 'Missing API path' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const targetUrl = `https://api.ecoledirecte.com/v3/${apiPath}`;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Token',
                'Access-Control-Expose-Headers': 'X-GTK-Token, X-2FA-Token, Set-Cookie',
            }
        });
    }

    try {
        // Build headers for the request to École Directe
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.ecoledirecte.com',
            'Referer': 'https://www.ecoledirecte.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        };

        // Forward X-Token if present
        const xToken = request.headers.get('X-Token');
        if (xToken) {
            headers['X-Token'] = xToken;
        }

        // Forward cookies
        const cookie = request.headers.get('Cookie');
        if (cookie) {
            headers['Cookie'] = cookie;
        }

        // Get request body for POST requests
        let body = null;
        if (request.method === 'POST') {
            body = await request.text();
        }

        // Make the request to École Directe
        const response = await fetch(targetUrl, {
            method: request.method,
            headers,
            body,
        });

        // Get response data
        const data = await response.text();

        // Build response headers
        const responseHeaders = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'X-GTK-Token, X-2FA-Token',
        };

        // Forward Set-Cookie and extract GTK token
        const setCookie = response.headers.get('Set-Cookie');
        if (setCookie) {
            // Can't set Set-Cookie in edge function response directly to browser
            // but we can extract GTK and send it as a custom header
            const gtkMatch = setCookie.match(/GTK=([^;]+)/);
            if (gtkMatch) {
                responseHeaders['X-GTK-Token'] = gtkMatch[1];
            }
        }

        // Forward 2FA token
        const token2fa = response.headers.get('2fa-token');
        if (token2fa) {
            responseHeaders['X-2FA-Token'] = token2fa;
        }

        return new Response(data, {
            status: response.status,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({
            error: error.message,
            code: 500
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
