/**
 * GOOGLE APPS SCRIPT - BACKEND API & GOOGLE SHEETS DATABASE
 * PENDATAAN TELITIAN HAJATAN - GIBRAN KURNIAWAN
 * 
 * ============================================================================
 * PETUNJUK LENGKAP INSTALASI & PENERAPAN (DEPLOYMENT):
 * ============================================================================
 * 1. Buka Google Spreadsheet baru di browser Anda.
 *    Beri judul spreadsheet: "DATABASE TELITIAN GIBRAN KURNIAWAN"
 * 
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 
 * 3. Hapus semua teks bawaan di editor Apps Script, lalu TEMPELKAN (PASTE)
 *    seluruh isi kode dari file ini.
 * 
 * 4. PENGATURAN KATA SANDI (SECRET KEY) - PENTING:
 *    - Di menu sebelah kiri, klik ikon Gerigi ("Project Settings" / "Setelan Project")
 *    - Gulir ke bawah ke bagian "Script Properties" (Properti Skrip)
 *    - Klik "Add script property" (Tambahkan properti skrip):
 *        * Property : APPS_SCRIPT_SECRET
 *        * Value    : telitian-gibran-secret-2026
 *      (Atau kata sandi rahasia lain yang Anda kehendaki)
 *    - Klik "Save script properties".
 * 
 * 5. INISIALISASI DATABASE OTOMATIS:
 *    - Kembali ke tab "Editor" (ikon kurung siku < > di kiri)
 *    - Di bilah atas samping tombol "Debug", pilih fungsi: "setupDatabase"
 *    - Klik tombol "Run" (Jalankan)
 *    - Berikan izin akses Google jika diminta ("Review Permissions" > Pilih Akun > Advanced > Go to Untitled (unsafe) > Allow)
 *    - Sheet DATA_TELITIAN, DATA_TERHAPUS, LOG_AKTIVITAS, dan ARCHIVE_TELITIAN akan otomatis terbuat!
 * 
 * 6. PENERAPAN SEBAGAI WEB APP (DEPLOYMENT) - SANGAT PENTING:
 *    - Klik tombol biru "Deploy" (Terapkan) di pojok kanan atas > "New deployment"
 *    - Pada ikon gerigi "Select type", pilih: "Web app" (Aplikasi Web)
 *    - Description : API Telitian Gibran v1
 *    - Execute as  : "Me" (Saya / email Anda)
 *    - Who has access (Siapa yang memiliki akses) : "Anyone" (Siapa saja)
 *      *PERHATIAN*: Opsi ini HARUS "Anyone" agar server web dapat mengirim data tanpa terhalang login Google.
 *    - Klik "Deploy"
 * 
 * 7. SALIN WEB APP URL:
 *    - Salin "Web app URL" (yang berakhiran /exec)
 *    - Masukkan ke file .env aplikasi web Anda:
 *        GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 *        APPS_SCRIPT_SECRET=telitian-gibran-secret-2026
 * ============================================================================
 */

// ============================================================================
// KONFIGURASI DATABASE SPREADSHEET
// ============================================================================
const SPREADSHEET_ID = '1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs';
const TARGET_SHEET_GID = 1699924787;
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787';

const SHEET_MAIN = 'DATA_TELITIAN';
const SHEET_DELETED = 'DATA_TERHAPUS';
const SHEET_LOGS = 'LOG_AKTIVITAS';
const SHEET_ARCHIVE = 'ARCHIVE_TELITIAN';
const BACKUP_FOLDER_NAME = 'BACKUP TELITIAN GIBRAN KURNIAWAN';

/**
 * Mendapatkan referensi Spreadsheet aktif.
 * Mendukung Spreadsheet terikat (Extensions > Apps Script) maupun Standalone (via SPREADSHEET_ID).
 */
function getSpreadsheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SPREADSHEET_ID;
    if (propId) {
      try {
        ss = SpreadsheetApp.openById(propId.trim());
      } catch (err) {
        Logger.log('Gagal membuka SPREADSHEET_ID: ' + err);
      }
    }
  }
  return ss;
}

/**
 * Mendapatkan Sheet Utama Telitian secara cerdas.
 * Memeriksa sheet dengan GID target 1699924787, lalu nama 'DATA_TELITIAN', atau sheet pertama.
 */
function getMainSheet(ss) {
  if (!ss) return null;

  // 1. Coba cari sheet berdasarkan target GID (1699924787)
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === TARGET_SHEET_GID) {
      return sheets[i];
    }
  }

  // 2. Coba cari sheet berdasarkan nama SHEET_MAIN ('DATA_TELITIAN')
  let sheet = ss.getSheetByName(SHEET_MAIN);
  if (sheet) return sheet;

  // 3. Jika hanya ada sheet pertama (misal 'Sheet1')
  if (sheets.length > 0) {
    return sheets[0];
  }

  return ss.insertSheet(SHEET_MAIN);
}

/**
 * Inisialisasi struktur sheet dan kolom otomatis.
 * Jalankan fungsi ini sekali setelah menempelkan kode.
 */
function setupDatabase() {
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet tidak ditemukan. ID Spreadsheet: ' + SPREADSHEET_ID);
  }

  // 1. Sheet DATA_TELITIAN (Utama)
  let sheetMain = getMainSheet(ss);
  if (!sheetMain) {
    sheetMain = ss.insertSheet(SHEET_MAIN);
  }

  const headersMain = [
    'ID', 'No', 'Nama', 'Alamat', 'Jumlah',
    'Tanggal Input', 'Jam Input', 'Created At', 'Updated At'
  ];
  if (sheetMain.getLastRow() === 0) {
    sheetMain.appendRow(headersMain);
    sheetMain.getRange('A1:I1').setBackground('#1E1B4B').setFontColor('#FFFFFF').setFontWeight('bold');
    sheetMain.setFrozenRows(1);
  }

  // 2. Sheet DATA_TERHAPUS (Soft Delete)
  let sheetDeleted = ss.getSheetByName(SHEET_DELETED);
  if (!sheetDeleted) {
    sheetDeleted = ss.insertSheet(SHEET_DELETED);
  }
  const headersDeleted = ['ID', 'No', 'Nama', 'Alamat', 'Jumlah', 'Waktu Penghapusan', 'Dihapus Oleh'];
  if (sheetDeleted.getLastRow() === 0) {
    sheetDeleted.appendRow(headersDeleted);
    sheetDeleted.getRange('A1:G1').setBackground('#991B1B').setFontColor('#FFFFFF').setFontWeight('bold');
    sheetDeleted.setFrozenRows(1);
  }

  // 3. Sheet LOG_AKTIVITAS (Audit Trail)
  let sheetLogs = ss.getSheetByName(SHEET_LOGS);
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet(SHEET_LOGS);
  }
  const headersLogs = ['Tanggal', 'Waktu', 'Aktivitas', 'ID Data', 'Nama', 'Keterangan'];
  if (sheetLogs.getLastRow() === 0) {
    sheetLogs.appendRow(headersLogs);
    sheetLogs.getRange('A1:F1').setBackground('#374151').setFontColor('#FFFFFF').setFontWeight('bold');
    sheetLogs.setFrozenRows(1);
  }

  // 4. Sheet ARCHIVE_TELITIAN (Arsip Reset Mulai dari 0)
  let sheetArchive = ss.getSheetByName(SHEET_ARCHIVE);
  if (!sheetArchive) {
    sheetArchive = ss.insertSheet(SHEET_ARCHIVE);
  }
  const headersArchive = ['ID', 'No', 'Nama', 'Alamat', 'Jumlah', 'Tanggal Input', 'Jam Input', 'Waktu Arsip / Reset', 'Keterangan'];
  if (sheetArchive.getLastRow() === 0) {
    sheetArchive.appendRow(headersArchive);
    sheetArchive.getRange('A1:I1').setBackground('#4338CA').setFontColor('#FFFFFF').setFontWeight('bold');
    sheetArchive.setFrozenRows(1);
  }

  Logger.log('Inisialisasi database Telitian Gibran Kurniawan selesai dengan sukses.');
  return { success: true, message: 'Database dan sheet berhasil diinisialisasi.' };
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'getData';

    // Ping / Test endpoint: mengizinkan verifikasi konektivitas cepat
    if (action === 'ping' || action === 'test') {
      const serverSecret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_SECRET');
      const ss = getSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Google Apps Script API Telitian Gibran Kurniawan Aktif & Terhubung!',
        spreadsheetConnected: !!ss,
        spreadsheetName: ss ? ss.getName() : null,
        hasSecretConfigured: !!serverSecret,
        timestamp: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB'
      });
    }

    // Verifikasi Secret Key untuk aksi data
    if (!verifySecret(params.secret)) {
      return jsonResponse({
        success: false,
        error: 'Unauthorized: Secret key invalid atau belum cocok dengan APPS_SCRIPT_SECRET.'
      });
    }

    if (action === 'getData') {
      return jsonResponse(getAllData());
    } else if (action === 'getStats') {
      return jsonResponse(getStats());
    } else if (action === 'backup') {
      return jsonResponse(backupDatabase());
    }

    return jsonResponse({ success: false, error: 'Aksi GET tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Internal Error: ' + err.toString() });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Kunci proses maksimal 30 detik untuk mencegah balapan konkurensi data
    lock.waitLock(30000);

    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || (e && e.parameter && e.parameter.action);
    const clientSecret = payload.secret || (e && e.parameter && e.parameter.secret);

    // Ping / Test
    if (action === 'ping' || action === 'test') {
      return jsonResponse({
        success: true,
        message: 'POST Google Apps Script Berhasil Diterima!'
      });
    }

    // Verifikasi Secret Key
    if (!verifySecret(clientSecret)) {
      return jsonResponse({
        success: false,
        error: 'Unauthorized: Secret key invalid atau belum cocok dengan APPS_SCRIPT_SECRET.'
      });
    }

    if (action === 'createData') {
      return jsonResponse(createRecord(payload.data));
    } else if (action === 'batchCreateData') {
      return jsonResponse(batchCreateRecords(payload.records || []));
    } else if (action === 'updateData') {
      return jsonResponse(updateRecord(payload.id, payload.data));
    } else if (action === 'deleteData') {
      return jsonResponse(deleteRecord(payload.id, payload.deletedBy));
    } else if (action === 'resetData') {
      return jsonResponse(resetData(payload.reason));
    } else if (action === 'backup') {
      return jsonResponse(backupDatabase());
    }

    return jsonResponse({ success: false, error: 'Aksi POST tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Internal Error: ' + err.toString() });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Abaikan jika sudah terlepas
    }
  }
}

/**
 * Verifikasi Secret Key dari Properti Skrip
 */
function verifySecret(clientSecret) {
  const serverSecret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_SECRET');
  if (!serverSecret || String(serverSecret).trim() === '') {
    // Jika belum diset di Script Properties, izinkan untuk mempermudah setup awal
    return true;
  }
  return String(clientSecret || '').trim() === String(serverSecret).trim();
}

/**
 * Ambil semua data telitian yang aktif
 */
function getAllData() {
  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  let sheet = getMainSheet(ss);
  if (!sheet) {
    setupDatabase();
    sheet = getMainSheet(ss);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, data: [], totalUang: 0, totalData: 0 };
  }

  // Deteksi kolom secara dinamis dari baris pertama (header)
  const headerRow = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
  let idCol = headerRow.findIndex(function(h) { return h === 'id' || h.indexOf('kode') !== -1 || h === 'uuid'; });
  let noCol = headerRow.findIndex(function(h) { return h === 'no' || h === 'nomor' || h.indexOf('no.') !== -1; });
  let nameCol = headerRow.findIndex(function(h) { return h.indexOf('nama') !== -1 || h === 'tamu' || h === 'name'; });
  let addrCol = headerRow.findIndex(function(h) { return h.indexOf('alamat') !== -1 || h.indexOf('desa') !== -1 || h.indexOf('kota') !== -1 || h === 'address'; });
  let amountCol = headerRow.findIndex(function(h) { return h.indexOf('jumlah') !== -1 || h.indexOf('nominal') !== -1 || h.indexOf('uang') !== -1 || h.indexOf('amplop') !== -1; });
  let dateCol = headerRow.findIndex(function(h) { return h.indexOf('tanggal') !== -1 || h.indexOf('tgl') !== -1 || h.indexOf('date') !== -1; });
  let timeCol = headerRow.findIndex(function(h) { return h.indexOf('jam') !== -1 || h.indexOf('waktu') !== -1 || h.indexOf('time') !== -1; });
  let createdCol = headerRow.findIndex(function(h) { return h.indexOf('created') !== -1; });
  let updatedCol = headerRow.findIndex(function(h) { return h.indexOf('updated') !== -1; });

  // Posisi fallback jika header belum ada
  if (idCol === -1) idCol = 0;
  if (noCol === -1) noCol = 1;
  if (nameCol === -1) nameCol = 2;
  if (addrCol === -1) addrCol = 3;
  if (amountCol === -1) amountCol = 4;
  if (dateCol === -1) dateCol = 5;
  if (timeCol === -1) timeCol = 6;

  const rows = data.slice(1);
  const records = [];
  let totalUang = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Lewati baris kosong jika ID dan Nama kosong
    if (!row[idCol] && !row[nameCol]) continue;

    // Parse amount dengan proteksi format teks atau simbol mata uang
    let amount = 0;
    const rawAmount = amountCol !== -1 ? row[amountCol] : 0;
    if (typeof rawAmount === 'number') {
      amount = Math.max(0, rawAmount);
    } else if (rawAmount) {
      const cleaned = String(rawAmount).replace(/[^0-9]/g, '');
      amount = parseInt(cleaned, 10) || 0;
    }
    totalUang += amount;

    // Parse dateInput
    let dateInputStr = '';
    const rawDate = dateCol !== -1 ? row[dateCol] : '';
    if (rawDate instanceof Date) {
      dateInputStr = Utilities.formatDate(rawDate, 'Asia/Jakarta', 'dd/MM/yyyy');
    } else {
      dateInputStr = String(rawDate || '');
    }

    // Parse timeInput
    let timeInputStr = '';
    const rawTime = timeCol !== -1 ? row[timeCol] : '';
    if (rawTime instanceof Date) {
      timeInputStr = Utilities.formatDate(rawTime, 'Asia/Jakarta', 'HH:mm') + ' WIB';
    } else {
      timeInputStr = String(rawTime || '');
    }

    // Parse timestamp ISO
    let createdAtStr = '';
    const rawCreated = createdCol !== -1 ? row[createdCol] : '';
    if (rawCreated instanceof Date) {
      createdAtStr = rawCreated.toISOString();
    } else {
      createdAtStr = String(rawCreated || '');
    }

    let updatedAtStr = '';
    const rawUpdated = updatedCol !== -1 ? row[updatedCol] : '';
    if (rawUpdated instanceof Date) {
      updatedAtStr = rawUpdated.toISOString();
    } else {
      updatedAtStr = String(rawUpdated || '');
    }

    const idStr = String(row[idCol] || ('TLT-' + ('000000' + (i + 1)).slice(-6)));
    const noVal = parseInt(row[noCol], 10) || (i + 1);

    records.push({
      id: idStr,
      no: noVal,
      name: String(row[nameCol] || '').trim(),
      address: String(row[addrCol] || '').trim(),
      amount: amount,
      dateInput: dateInputStr,
      timeInput: timeInputStr,
      createdAt: createdAtStr,
      updatedAt: updatedAtStr,
    });
  }

  return {
    success: true,
    data: records,
    totalData: records.length,
    totalUang: totalUang,
  };
}

/**
 * Ringkasan Statistik Singkat
 */
function getStats() {
  const res = getAllData();
  if (!res.success) return res;
  return {
    success: true,
    totalData: res.totalData,
    totalUang: res.totalUang,
  };
}

/**
 * Simpan Data Telitian Baru (Create) - Dilengkapi Proteksi Anti-Duplikasi
 */
function createRecord(data) {
  if (!data || !data.name || String(data.name).trim() === '') {
    return { success: false, error: 'Nama tamu wajib diisi' };
  }

  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  let sheet = getMainSheet(ss);
  if (!sheet) {
    setupDatabase();
    sheet = getMainSheet(ss);
  }

  const values = sheet.getDataRange().getValues();
  const name = String(data.name).trim();
  const address = String(data.address || '').trim();

  let amount = 0;
  if (typeof data.amount === 'number') {
    amount = Math.max(0, data.amount);
  } else if (data.amount) {
    const cleaned = String(data.amount).replace(/[^0-9]/g, '');
    amount = parseInt(cleaned, 10) || 0;
  }

  const now = new Date();
  const dateInput = data.dateInput || Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy');
  const timeInput = data.timeInput || (Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm') + ' WIB');
  const isoNow = now.toISOString();

  // 1. Pemeriksaan Anti-Duplikasi: Cek apakah ID atau data tamu identik sudah ada
  let maxNo = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowId = String(row[0] || '');
    const num = parseInt(row[1], 10);
    if (!isNaN(num) && num > maxNo) maxNo = num;

    // Jika ID diberikan dan sudah ada di sheet
    if (data.id && rowId === String(data.id)) {
      return {
        success: true,
        message: 'Data dengan ID tersebut sudah tersimpan di Google Sheets (duplikasi dicegah).',
        isDuplicate: true,
        record: {
          id: rowId,
          no: num || i,
          name: String(row[2] || ''),
          address: String(row[3] || ''),
          amount: typeof row[4] === 'number' ? row[4] : parseInt(String(row[4] || 0), 10),
          dateInput: String(row[5] || ''),
          timeInput: String(row[6] || ''),
        }
      };
    }

    // Jika nama, nominal, dan tanggal input identik (mencegah klik ganda saat refresh)
    const rowName = String(row[2] || '').trim().toLowerCase();
    const rowAmount = typeof row[4] === 'number' ? row[4] : parseInt(String(row[4] || '').replace(/[^0-9]/g, ''), 10);
    const rowDate = String(row[5] || '');
    if (
      rowName === name.toLowerCase() &&
      rowAmount === amount &&
      (rowDate === dateInput || !rowDate)
    ) {
      // Duplikasi nama & nominal pada hari yang sama dicegah
      return {
        success: true,
        message: 'Data atas nama ' + name + ' dengan nominal Rp ' + amount.toLocaleString('id-ID') + ' sudah terdaftar (duplikasi dicegah).',
        isDuplicate: true,
        record: {
          id: rowId,
          no: num || i,
          name: String(row[2] || ''),
          address: String(row[3] || ''),
          amount: rowAmount,
          dateInput: rowDate,
          timeInput: String(row[6] || ''),
        }
      };
    }
  }

  const nextNo = maxNo + 1;
  const id = data.id || ('TLT-' + ('000000' + nextNo).slice(-6));

  sheet.appendRow([
    id,
    nextNo,
    name,
    address,
    amount,
    dateInput,
    timeInput,
    isoNow,
    isoNow
  ]);
  SpreadsheetApp.flush();

  // Catat Log Aktivitas
  logActivity('Tambah Data', id, name, `Nominal: Rp ${amount.toLocaleString('id-ID')}`);

  return {
    success: true,
    message: 'Data berhasil disimpan ke Google Sheets.',
    record: {
      id: id,
      no: nextNo,
      name: name,
      address: address,
      amount: amount,
      dateInput: dateInput,
      timeInput: timeInput,
      createdAt: isoNow,
      updatedAt: isoNow
    }
  };
}

/**
 * Simpan Banyak Data Sekaligus (Batch Create - untuk Sinkronisasi Offline)
 * Dilengkapi pengecekan duplikasi ketat agar tidak ada baris ganda
 */
function batchCreateRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, count: 0, message: 'Tidak ada data' };
  }

  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  let sheet = getMainSheet(ss);
  if (!sheet) {
    setupDatabase();
    sheet = getMainSheet(ss);
  }

  const values = sheet.getDataRange().getValues();
  let maxNo = 0;
  const existingIds = new Set();
  const existingSignatures = new Set();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const num = parseInt(row[1], 10);
    if (!isNaN(num) && num > maxNo) maxNo = num;
    
    if (row[0]) existingIds.add(String(row[0]).trim());
    if (row[2]) {
      const rowName = String(row[2]).trim().toLowerCase();
      const rowAmt = String(row[4] || 0);
      existingSignatures.add(rowName + '|' + rowAmt);
    }
  }

  const rowsToAppend = [];
  const now = new Date();
  const defaultDate = Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy');
  const defaultTime = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm') + ' WIB';
  const isoNow = now.toISOString();
  let skippedCount = 0;

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    if (!item.name || !String(item.name).trim()) continue;

    const cleanName = String(item.name).trim();
    const cleanAddress = String(item.address || '').trim();
    
    let amount = 0;
    if (typeof item.amount === 'number') {
      amount = Math.max(0, item.amount);
    } else if (item.amount) {
      amount = parseInt(String(item.amount).replace(/[^0-9]/g, ''), 10) || 0;
    }

    const signature = cleanName.toLowerCase() + '|' + amount;
    if (item.id && existingIds.has(String(item.id).trim())) {
      skippedCount++;
      continue;
    }
    if (existingSignatures.has(signature)) {
      skippedCount++;
      continue;
    }

    maxNo += 1;
    const id = item.id || ('TLT-' + ('000000' + maxNo).slice(-6));
    existingIds.add(id);
    existingSignatures.add(signature);

    rowsToAppend.push([
      id,
      maxNo,
      cleanName,
      cleanAddress,
      amount,
      item.dateInput || defaultDate,
      item.timeInput || defaultTime,
      item.createdAt || isoNow,
      isoNow
    ]);
  }

  if (rowsToAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, 9).setValues(rowsToAppend);
    SpreadsheetApp.flush();
    logActivity('Sync Offline', 'BATCH', 'Admin', `Sinkronisasi batch ${rowsToAppend.length} data (Dilewati duplikat: ${skippedCount})`);
  }

  return {
    success: true,
    count: rowsToAppend.length,
    skippedDuplicates: skippedCount,
    message: `${rowsToAppend.length} data berhasil disimpan (Duplikat terdeteksi & dilewati: ${skippedCount}).`
  };
}

/**
 * Perbarui Data Telitian (Update)
 */
function updateRecord(id, data) {
  if (!id || !data) {
    return { success: false, error: 'ID dan Data wajib disediakan' };
  }

  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  const sheet = getMainSheet(ss);
  if (!sheet) return { success: false, error: 'Sheet DATA_TELITIAN tidak ditemukan' };

  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Data dengan ID ' + id + ' tidak ditemukan di Google Sheets.' };
  }

  const now = new Date();
  const isoNow = now.toISOString();

  let amount = 0;
  if (typeof data.amount === 'number') {
    amount = Math.max(0, data.amount);
  } else if (data.amount) {
    amount = parseInt(String(data.amount).replace(/[^0-9]/g, ''), 10) || 0;
  }

  const name = String(data.name).trim();
  const address = String(data.address || '').trim();

  // Update kolom C (Nama), D (Alamat), E (Jumlah), I (Updated At)
  sheet.getRange(rowIndex, 3).setValue(name);
  sheet.getRange(rowIndex, 4).setValue(address);
  sheet.getRange(rowIndex, 5).setValue(amount);
  sheet.getRange(rowIndex, 9).setValue(isoNow);
  SpreadsheetApp.flush();

  // Catat Log Aktivitas
  logActivity('Edit Data', id, name, `Nominal baru: Rp ${amount.toLocaleString('id-ID')}`);

  return {
    success: true,
    message: 'Data berhasil diperbarui di Google Sheets.',
    record: {
      id: id,
      name: name,
      address: address,
      amount: amount,
      updatedAt: isoNow
    }
  };
}

/**
 * Soft Delete Data ke sheet DATA_TERHAPUS
 */
function deleteRecord(id, deletedBy) {
  if (!id) return { success: false, error: 'ID tidak valid' };

  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  const sheet = getMainSheet(ss);
  if (!sheet) return { success: false, error: 'Sheet DATA_TELITIAN tidak ditemukan' };

  let sheetDeleted = ss.getSheetByName(SHEET_DELETED);
  if (!sheetDeleted) {
    setupDatabase();
    sheetDeleted = ss.getSheetByName(SHEET_DELETED);
  }

  const values = sheet.getDataRange().getValues();
  let targetRow = -1;
  let deletedRecord = null;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(id).trim()) {
      targetRow = i + 1;
      deletedRecord = values[i];
      break;
    }
  }

  if (targetRow === -1 || !deletedRecord) {
    return { success: false, error: 'Data dengan ID ' + id + ' tidak ditemukan di Google Sheets.' };
  }

  const now = new Date();
  const deleteTime = Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss') + ' WIB';

  // 1. Pindahkan ke DATA_TERHAPUS
  sheetDeleted.appendRow([
    deletedRecord[0], // ID
    deletedRecord[1], // No
    deletedRecord[2], // Nama
    deletedRecord[3], // Alamat
    deletedRecord[4], // Jumlah
    deleteTime,
    deletedBy || 'Admin Meja'
  ]);

  // 2. Hapus baris dari DATA_TELITIAN
  sheet.deleteRow(targetRow);
  SpreadsheetApp.flush();

  // 3. Re-number kolom No agar berurutan 1..N
  const remainingRows = sheet.getLastRow();
  if (remainingRows > 1) {
    for (let r = 2; r <= remainingRows; r++) {
      sheet.getRange(r, 2).setValue(r - 1);
    }
  }

  // 4. Catat Log Aktivitas
  logActivity('Hapus Data (Soft Delete)', id, String(deletedRecord[2]), `Nominal: Rp ${Number(deletedRecord[4] || 0).toLocaleString('id-ID')}`);

  return {
    success: true,
    message: `Data atas nama ${deletedRecord[2]} berhasil dihapus dari Google Sheets.`
  };
}

/**
 * Reset Database ke 0 (Mulai dari 0) dengan Pengaman Arsip Otomatis
 */
function resetData(reason) {
  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  let sheet = getMainSheet(ss);
  if (!sheet) {
    setupDatabase();
    return { success: true, message: 'Database diinisialisasi ulang ke 0', totalData: 0, totalUang: 0 };
  }

  const lastRow = sheet.getLastRow();
  // Jika ada data (baris 2 ke atas)
  if (lastRow > 1) {
    // 1. Amankan data ke sheet ARCHIVE_TELITIAN
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') + ' WIB';
    let sheetArchive = ss.getSheetByName(SHEET_ARCHIVE);
    if (!sheetArchive) {
      sheetArchive = ss.insertSheet(SHEET_ARCHIVE);
      sheetArchive.appendRow(['ID', 'No', 'Nama', 'Alamat', 'Jumlah', 'Tanggal Input', 'Jam Input', 'Waktu Arsip / Reset', 'Keterangan']);
      sheetArchive.getRange('A1:I1').setBackground('#4338CA').setFontColor('#FFFFFF').setFontWeight('bold');
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, 9);
    const dataValues = dataRange.getValues();

    for (let i = 0; i < dataValues.length; i++) {
      const row = dataValues[i];
      if (!row[0] && !row[2]) continue;
      sheetArchive.appendRow([
        row[0], row[1], row[2], row[3], row[4], row[5], row[6], timestamp, reason || 'Reset Mulai Dari 0'
      ]);
    }

    // 2. Hapus baris data dari baris 2 ke bawah
    sheet.deleteRows(2, lastRow - 1);
  }

  SpreadsheetApp.flush();
  logActivity('Reset Database', 'SYSTEM', 'Admin', reason || 'Mulai dari 0');

  return {
    success: true,
    message: 'Data di Google Sheets berhasil direset ke 0. Data lama tersimpan aman di sheet ARCHIVE_TELITIAN.',
    totalData: 0,
    totalUang: 0
  };
}

/**
 * Backup Spreadsheet ke Folder Google Drive
 */
function backupDatabase() {
  const ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan' };

  const ssFile = DriveApp.getFileById(ss.getId());

  // Cari atau buat folder BACKUP
  let folder;
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(BACKUP_FOLDER_NAME);
  }

  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd-HHmm');
  const backupName = `Backup-Telitian-Gibran-${timestamp}`;

  // Gandakan file spreadsheet ke folder backup
  const backupFile = ssFile.makeCopy(backupName, folder);

  logActivity('Backup Database', 'SYSTEM', 'Admin', `File: ${backupName} (${backupFile.getUrl()})`);

  return {
    success: true,
    message: 'Cadangan spreadsheet berhasil disimpan ke Google Drive Anda.',
    backupName: backupName,
    url: backupFile.getUrl(),
    folderName: BACKUP_FOLDER_NAME,
    timestamp: timestamp
  };
}

/**
 * Catat aktivitas ke sheet LOG_AKTIVITAS
 */
function logActivity(activity, recordId, name, note) {
  try {
    const ss = getSpreadsheet();
    if (!ss) return;
    let sheetLogs = ss.getSheetByName(SHEET_LOGS);
    if (!sheetLogs) return;

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'Asia/Jakarta', 'dd/MM/yyyy');
    const timeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss') + ' WIB';

    sheetLogs.appendRow([
      dateStr,
      timeStr,
      activity,
      recordId || '-',
      name || '-',
      note || '-'
    ]);
  } catch (e) {
    Logger.log('Gagal mencatat log aktivitas: ' + e);
  }
}

/**
 * Helper JSON Response
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
