import { TelitianRecord } from '../types/record';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * List Google Spreadsheets from user's Google Drive
 */
export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengambil daftar spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }));
}

/**
 * Get Spreadsheet Title and Sheet Tab Names
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal membaca metadata Google Sheet.');
  }

  const data = await res.json();
  const title = data.properties?.title || 'Untitled Spreadsheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return { title, sheetNames };
}

/**
 * Convert Telitian Record into spreadsheet row format
 */
export function recordToRowValues(r: TelitianRecord, index: number): (string | number)[] {
  return [
    index + 1,
    r.id,
    r.name,
    r.address || '-',
    r.jenisTelitian || 'Telitian Dewasa',
    r.amount || 0,
    r.kategoriTamu || 'Umum',
    r.rincianBarang || 'Amplop Uang',
    r.petugas || 'Panitia Meja',
    r.statusValidasi || 'Valid',
    r.dateInput || '-',
    r.timeInput || '-',
  ];
}

export const SHEET_HEADER_ROW = [
  'No',
  'ID Telitian',
  'Nama Tamu / Donatur',
  'Alamat / Asal',
  'Jenis Telitian',
  'Nominal (Rp)',
  'Kategori Tamu',
  'Rincian Barang / Amplop',
  'Petugas Meja',
  'Status Validasi',
  'Tanggal Input',
  'Waktu Input',
];

/**
 * Create a new, fully formatted Google Spreadsheet directly in user's Google Drive
 */
export async function createSpreadsheetInDrive(
  accessToken: string,
  title: string,
  records: TelitianRecord[]
): Promise<{ id: string; url: string }> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  const rows = [SHEET_HEADER_ROW, ...records.map((r, i) => recordToRowValues(r, i))];

  // Calculate total amount
  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
  if (records.length > 0) {
    rows.push([
      'TOTAL',
      '',
      `${records.length} Entri Tamu`,
      '',
      '',
      totalAmount,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  const payload = {
    properties: {
      title: title || `Telitian Hajatan Khitanan Gibran Kurniawan - ${new Date().toLocaleDateString('id-ID')}`,
    },
    sheets: [
      {
        properties: {
          title: 'Data Telitian',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: rows.map((row) => ({
              values: row.map((cell) => ({
                userEnteredValue:
                  typeof cell === 'number'
                    ? { numberValue: cell }
                    : { stringValue: String(cell) },
              })),
            })),
          },
        ],
      },
    ],
  };

  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal membuat Google Sheet di Google Drive.');
  }

  const result = await res.json();
  const spreadsheetId = result.spreadsheetId;
  const webViewUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { id: spreadsheetId, url: webViewUrl };
}

/**
 * Append or Sync records to an existing Google Spreadsheet tab
 */
export async function syncRecordsToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTabName: string,
  records: TelitianRecord[]
): Promise<{ updatedRows: number }> {
  const rows = [SHEET_HEADER_ROW, ...records.map((r, i) => recordToRowValues(r, i))];

  const range = `${encodeURIComponent(sheetTabName)}!A1:L${rows.length}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menyinkronkan data ke Google Sheet.');
  }

  const result = await res.json();
  return { updatedRows: result.updatedRows || rows.length };
}

/**
 * Upload a JSON Backup file to Google Drive
 */
export async function uploadBackupToDrive(
  accessToken: string,
  fileName: string,
  records: TelitianRecord[]
): Promise<{ fileId: string; webViewLink: string }> {
  const metadata = {
    name: fileName || `Backup_Telitian_Gibran_${new Date().toISOString().slice(0, 10)}.json`,
    mimeType: 'application/json',
  };

  const content = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      event: 'Khitanan Gibran Kurniawan',
      count: records.length,
      totalNominal: records.reduce((s, r) => s + (r.amount || 0), 0),
      records,
    },
    null,
    2
  );

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([content], { type: 'application/json' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengunggah file cadangan ke Google Drive.');
  }

  const data = await res.json();
  return {
    fileId: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}
