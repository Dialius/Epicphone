import { defineConfig, Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';

function gasRpcPlugin(): Plugin {
  return {
    name: 'gas-rpc-bridge',
    configureServer(server) {
      server.middlewares.use('/api/gas-rpc', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const claspPath = 'C:/Users/ASUS/.clasprc.json';
            const clasp = JSON.parse(fs.readFileSync(claspPath, 'utf8'));
            const t = clasp.tokens.default;
            let token = t.access_token;

            // Perbarui token otomatis jika kedaluwarsa
            if (!t.expiry_date || Date.now() >= t.expiry_date - 60000) {
              const params = new URLSearchParams();
              params.append('client_id', t.client_id);
              params.append('client_secret', t.client_secret);
              params.append('refresh_token', t.refresh_token);
              params.append('grant_type', 'refresh_token');
              const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              });
              const tokenData = (await tokenRes.json()) as any;
              if (tokenData.access_token) {
                token = tokenData.access_token;
                t.access_token = token;
                t.expiry_date = Date.now() + (tokenData.expires_in * 1000);
                fs.writeFileSync(claspPath, JSON.stringify(clasp, null, 2));
              }
            }

            const gasUrl = 'https://script.google.com/macros/s/AKfycbwCvuvri7Ef4vw_whCitCe_3anCwJjGhfN7GHg6W_zJ19Ex8YUuNoJMr0lQUVs85k9Zxg/exec';
            const r = await fetch(gasUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: body,
              redirect: 'manual',
            });

            let finalResponseText = '';
            const loc = r.headers.get('location');
            if (loc) {
              const r2 = await fetch(loc);
              finalResponseText = await r2.text();
            } else {
              finalResponseText = await r.text();
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(finalResponseText);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, pesan: err.message || String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), viteSingleFile(), gasRpcPlugin()],
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    target: 'es2017',
    modulePreload: { polyfill: false },
    assetsInlineLimit: 1000000,
  },
  define: {
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
