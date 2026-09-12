import { GasService } from '../server/gasService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const items = body.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Batch items array is empty' });
    }

    const result = await GasService.batchSync(items);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('API Sync error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Sync error' });
  }
}
