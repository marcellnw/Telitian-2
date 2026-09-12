import type { Plugin } from 'vite';
import { GasService } from './gasService.ts';

function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });
    req.on('end', () => {
      try {
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-telitian-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url || '/', 'http://localhost:3000');
        const pathname = urlObj.pathname;

        if (!pathname.startsWith('/api/')) {
          return next();
        }

        // Set CORS & JSON headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        const queryParams = Object.fromEntries(urlObj.searchParams.entries());

        try {
          // Route: /api/health
          if (pathname === '/api/health') {
            const data = await GasService.checkHealth();
            res.statusCode = 200;
            res.end(JSON.stringify(data));
            return;
          }

          // Route: /api/stats
          if (pathname === '/api/stats') {
            const stats = await GasService.getStats();
            res.statusCode = 200;
            res.end(JSON.stringify(stats));
            return;
          }

          // Route: /api/records/changes or /api/records with changes
          if (pathname === '/api/records/changes' || (pathname === '/api/records' && (queryParams.changes === 'true' || queryParams.since !== undefined || queryParams.cursor !== undefined))) {
            const changes = await GasService.getChanges({
              since: queryParams.since,
              cursor: queryParams.cursor,
            });
            res.statusCode = 200;
            res.end(JSON.stringify(changes));
            return;
          }

          // Route: /api/records
          if (pathname === '/api/records') {
            if (req.method === 'GET') {
              const records = await GasService.getRecords({
                page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
                limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 50,
                search: queryParams.search || '',
              });
              res.statusCode = 200;
              res.end(JSON.stringify(records));
              return;
            }

            if (req.method === 'POST') {
              const body = await parseBody(req);
              if (!body.nama || !body.jumlah) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'Nama dan Jumlah wajib diisi' }));
                return;
              }
              const created = await GasService.createRecord(body);
              res.statusCode = 200;
              res.end(JSON.stringify(created));
              return;
            }

            if (req.method === 'PUT') {
              const body = await parseBody(req);
              if (!body.id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'ID record wajib disertakan' }));
                return;
              }
              const updated = await GasService.updateRecord(body.id, body.updateData || body, body.expectedVersion);
              if ((updated as any).conflict) {
                res.statusCode = 409;
              } else {
                res.statusCode = 200;
              }
              res.end(JSON.stringify(updated));
              return;
            }

            if (req.method === 'DELETE') {
              const body = await parseBody(req);
              const id = body.id || queryParams.id;
              if (!id) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, message: 'ID record wajib disertakan' }));
                return;
              }
              const deleted = await GasService.deleteRecord(id);
              res.statusCode = 200;
              res.end(JSON.stringify(deleted));
              return;
            }
          }

          // Route: /api/sync or /api/sync/batch
          if (pathname === '/api/sync' || pathname === '/api/sync/batch') {
            if (req.method === 'POST') {
              const body = await parseBody(req);
              const items = body.items || [];
              const result = await GasService.batchSync(items);
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }
          }

          // Route not matched
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: `Endpoint ${pathname} tidak ditemukan` }));
        } catch (err: any) {
          console.error('[API Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: err.message || 'Server error' }));
        }
      });
    },
  };
}
