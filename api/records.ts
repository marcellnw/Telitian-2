import { GasService } from '../server/gasService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};

  try {
    // 1. GET: read records or delta changes
    if (req.method === 'GET') {
      const isChanges = query.changes === 'true' || query.since !== undefined || query.cursor !== undefined;
      if (isChanges) {
        const changes = await GasService.getChanges({
          since: query.since,
          cursor: query.cursor,
        });
        return res.status(200).json(changes);
      }

      const records = await GasService.getRecords({
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        search: query.search || '',
      });
      return res.status(200).json(records);
    }

    // 2. POST: create record
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.nama || !body.jumlah) {
        return res.status(400).json({ success: false, message: 'Nama dan Jumlah wajib diisi' });
      }
      const created = await GasService.createRecord({
        id: body.id,
        clientRequestId: body.clientRequestId,
        nama: body.nama,
        alamat: body.alamat || '',
        jumlah: Number(body.jumlah),
      });
      return res.status(200).json(created);
    }

    // 3. PUT: update record
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.id) {
        return res.status(400).json({ success: false, message: 'ID record wajib disertakan' });
      }
      const updated = await GasService.updateRecord(body.id, body.updateData || body, body.expectedVersion);
      if ((updated as any).conflict) {
        return res.status(409).json(updated);
      }
      return res.status(200).json(updated);
    }

    // 4. DELETE: soft delete record
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = body?.id || query.id;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID record wajib disertakan' });
      }
      const deleted = await GasService.deleteRecord(id);
      return res.status(200).json(deleted);
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('API Records error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
}
