import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Crucial for Electron to find assets
  plugins: [react()],

  // Proxy configuration for École Directe API (bypasses CORS in development)
  server: {
    // Fix WebSocket HMR issues on Windows
    hmr: {
      host: 'localhost',
    },
    proxy: {
      // Proxy /api/ed requests to École Directe
      '/api/ed': {
        target: 'https://api.ecoledirecte.com/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ed/, ''),
        cookieDomainRewrite: '',
        configure: (proxy) => {
          // Store all session data
          const session = {
            gtkCookie: null,
            allCookies: [],
          };

          proxy.on('proxyReq', (proxyReq, req) => {
            // Set required headers
            proxyReq.setHeader('Origin', 'https://www.ecoledirecte.com');
            proxyReq.setHeader('Referer', 'https://www.ecoledirecte.com/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

            // Forward all stored cookies
            if (session.allCookies.length > 0) {
              const existingCookie = proxyReq.getHeader('Cookie') || '';
              const allCookies = [...session.allCookies];
              if (existingCookie) {
                allCookies.push(existingCookie);
              }
              proxyReq.setHeader('Cookie', allCookies.join('; '));
              console.log('🍪 Forwarding cookies:', allCookies.join('; ').substring(0, 50) + '...');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Capture ALL Set-Cookie headers
            const setCookies = proxyRes.headers['set-cookie'];
            if (setCookies) {
              for (const cookie of setCookies) {
                // Extract cookie name=value (before the first ;)
                const cookieValue = cookie.split(';')[0];
                const [cookieName, cookieVal] = cookieValue.split('=');

                // Skip empty cookies (when API clears them)
                if (!cookieVal || cookieVal.trim() === '') {
                  console.log(`⚠️ Ignoring empty cookie: ${cookieName}`);
                  continue;
                }

                // Check if this cookie is already stored
                const existingIndex = session.allCookies.findIndex(c => c.startsWith(cookieName + '='));

                if (existingIndex >= 0) {
                  session.allCookies[existingIndex] = cookieValue;
                } else {
                  session.allCookies.push(cookieValue);
                }

                // Special handling for GTK
                if (cookieName === 'GTK') {
                  session.gtkValue = cookieVal;
                  res.setHeader('X-GTK-Token', cookieVal);
                  console.log('🔑 GTK Token captured:', cookieVal.substring(0, 20) + '...');
                }
              }
            }

            // Capture 2fa-token header and expose it
            const token2fa = proxyRes.headers['2fa-token'];
            if (token2fa) {
              res.setHeader('X-2FA-Token', token2fa);
              console.log('🔒 2FA Token captured:', token2fa.substring(0, 20) + '...');
            }

            // Log response code for debugging
            console.log(`📡 ${req.url} -> code in response body`);
          });
        },
      },
    },
  },
})
