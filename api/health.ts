import app from '../server/app.ts';

export default function handler(req: any, res: any) {
  const originalUrl = req.url || '/';
  if (!originalUrl || originalUrl === '/' || originalUrl.startsWith('/?')) {
    req.url = '/api/health' + (originalUrl.startsWith('/?') ? originalUrl.slice(1) : '');
  } else if (!originalUrl.startsWith('/api/health')) {
    if (originalUrl.startsWith('/api')) {
      // already starts with /api
    } else {
      req.url = '/api/health' + (originalUrl.startsWith('/') ? originalUrl : '/' + originalUrl);
    }
  }
  return app(req, res);
}

