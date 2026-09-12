import { GasService } from '../server/gasService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const health = await GasService.checkHealth();
    return res.status(200).json(health);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      cloud: 'error',
      message: err.message || 'Health check error',
    });
  }
}
