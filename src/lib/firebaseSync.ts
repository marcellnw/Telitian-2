/**
 * Firebase Firestore & Authentication Synchronization Service
 * 
 * Provides real-time and on-demand cloud sync across devices (mobile, tablet, desktop)
 * and ensures full compatibility when deployed to Vercel or cloud containers.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  Unsubscribe,
  addDoc,
} from 'firebase/firestore';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebaseClient';
import { TelitianRecord } from '../types/record';
import { getErrorMessage } from './errorHelper';
import {
  fetchGasRecordsDirect,
  batchCreateGasRecordsDirect,
  getSavedGasUrl,
  getSavedGasSecret,
  setCloudGasUrlCache,
} from './gasClient';

export interface CloudSheetsConfig {
  googleAppsScriptUrl: string;
  appsScriptSecret: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetGid: string;
  updatedAt?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
}

// Default spreadsheet constants matching hajatan setup
export const DEFAULT_SPREADSHEET_CONFIG: CloudSheetsConfig = {
  googleAppsScriptUrl: '',
  appsScriptSecret: 'telitian-gibran-secret-2026',
  spreadsheetId: '1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1EPW6gmiZ1uqy2C9_dXB012LXldYVC838axkONsqL5Xs/edit?gid=1699924787',
  sheetGid: '1699924787',
};

// Clean object helper: Firestore rejects undefined values
function cleanForFirestore(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
}

/**
 * Inisialisasi autentikasi background (Anonymous Auth)
 * Memastikan setiap perangkat di domain manapun (HP, laptop, Vercel)
 * langsung memiliki sesi autentikasi valid tanpa perlu login manual.
 */
export async function initAnonymousAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    // Sesi anonim mungkin dinonaktifkan di console, fallback tetap aman
    return null;
  }
}

/**
 * Dapatkan konfigurasi Google Sheets tersinkron dari Cloud Firestore
 * Memungkinkan seluruh perangkat di berbagai domain mengetahui URL Web App yang sama
 */
export async function fetchCloudSheetsConfig(): Promise<CloudSheetsConfig | null> {
  try {
    const docRef = doc(db, 'app_settings', 'sheets_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as CloudSheetsConfig;
      if (data.googleAppsScriptUrl) {
        setCloudGasUrlCache(data.googleAppsScriptUrl, data.appsScriptSecret);
      }
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch cloud sheets config:', err);
  }
  return null;
}

/**
 * Simpan konfigurasi Google Sheets ke Cloud Firestore
 * Langsung tersinkron ke semua perangkat lain dalam hitungan detik
 */
export async function saveCloudSheetsConfig(
  config: Partial<CloudSheetsConfig>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'app_settings', 'sheets_config');
    const merged = cleanForFirestore({
      ...DEFAULT_SPREADSHEET_CONFIG,
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || auth.currentUser?.displayName || 'Operator',
    });
    await setDoc(docRef, merged, { merge: true });
    if (config.googleAppsScriptUrl) {
      setCloudGasUrlCache(config.googleAppsScriptUrl, config.appsScriptSecret);
    }
    return true;
  } catch (err) {
    console.error('Error saving cloud sheets config:', err);
    return false;
  }
}

/**
 * Subscribe ke konfigurasi Google Sheets secara realtime
 */
export function subscribeToCloudSheetsConfig(
  callback: (config: CloudSheetsConfig | null) => void
): Unsubscribe {
  const docRef = doc(db, 'app_settings', 'sheets_config');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CloudSheetsConfig;
        if (data.googleAppsScriptUrl) {
          setCloudGasUrlCache(data.googleAppsScriptUrl, data.appsScriptSecret);
        }
        callback(data);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Sheets config real-time listener note:', err);
    }
  );
}

/**
 * Get current Firebase User
 */
export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to Auth State Changes
 */
export function onFirebaseAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Record user profile in Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(
          userDocRef,
          cleanForFirestore({
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email || 'Operator Telitian',
            photoURL: user.photoURL || '',
            lastLogin: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Could not update user profile in Firestore:', err);
      }
    }
    callback(user);
  });
}

/**
 * Sign In with Google Provider
 */
export async function signInGooglePopup(): Promise<{ user: User; message: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return {
      user: result.user,
      message: `Berhasil login dengan ${result.user.displayName || result.user.email}`,
    };
  } catch (error: any) {
    console.error('Firebase Google Sign-In error:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Jendela login Google ditutup sebelum selesai.');
    } else if (error?.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Domain belum terdaftar di Firebase Authorized Domains. Tambahkan domain ini di Firebase Console > Authentication > Settings.'
      );
    } else if (error?.code === 'auth/popup-blocked') {
      throw new Error('Popup browser terblokir. Harap izinkan popup pada browser Anda.');
    }
    throw new Error(getErrorMessage(error, 'Gagal masuk dengan akun Google.'));
  }
}

/**
 * Sign In with Email and Password
 */
export async function signInEmailPassword(
  email: string,
  pass: string
): Promise<{ user: User; message: string }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return {
      user: result.user,
      message: `Berhasil login sebagai ${result.user.email}`,
    };
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
      throw new Error('Email atau password tidak sesuai.');
    } else if (error?.code === 'auth/invalid-email') {
      throw new Error('Format email tidak valid.');
    }
    throw new Error(getErrorMessage(error, 'Gagal login dengan email & password.'));
  }
}

/**
 * Register with Email and Password
 */
export async function registerEmailPassword(
  email: string,
  pass: string
): Promise<{ user: User; message: string }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    return {
      user: result.user,
      message: `Akun ${result.user.email} berhasil dibuat dan login.`,
    };
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('Email ini sudah terdaftar. Silakan langsung masuk (Login).');
    } else if (error?.code === 'auth/weak-password') {
      throw new Error('Password terlalu lemah. Gunakan minimal 6 karakter.');
    }
    throw new Error(getErrorMessage(error, 'Gagal membuat akun baru.'));
  }
}

/**
 * Sign Out
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Fetch all records from Firestore
 */
export async function fetchFirestoreRecords(): Promise<TelitianRecord[]> {
  const recordsCol = collection(db, 'records');
  const q = query(recordsCol, orderBy('no', 'asc'));
  const snap = await getDocs(q);

  const items: TelitianRecord[] = [];
  snap.forEach((d) => {
    items.push(d.data() as TelitianRecord);
  });
  return items;
}

/**
 * Save or update a single record in Firestore
 */
export async function saveRecordToFirestore(record: TelitianRecord): Promise<boolean> {
  if (!record.id) return false;
  try {
    const docRef = doc(db, 'records', record.id);
    const currentUser = auth.currentUser;
    const cleanData = cleanForFirestore({
      ...record,
      updatedAt: record.updatedAt || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Operator',
    });
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving record to Firestore:', error);
    return false;
  }
}

/**
 * Delete a record in Firestore (and archive into deleted_records)
 */
export async function deleteRecordFromFirestore(
  recordId: string,
  recordData?: TelitianRecord
): Promise<boolean> {
  if (!recordId) return false;
  try {
    const docRef = doc(db, 'records', recordId);
    await deleteDoc(docRef);

    // Archive into deleted_records collection
    if (recordData) {
      try {
        const deletedRef = doc(db, 'deleted_records', recordId);
        await setDoc(
          deletedRef,
          cleanForFirestore({
            ...recordData,
            deletedAt: new Date().toISOString(),
            deletedBy: auth.currentUser?.email || 'Operator',
          }),
          { merge: true }
        );
      } catch (_) {}
    }

    // Log to activity_logs
    try {
      await addDoc(
        collection(db, 'activity_logs'),
        cleanForFirestore({
          activity: 'Hapus Data',
          recordId,
          name: recordData?.name || recordId,
          operator: auth.currentUser?.email || 'Operator',
          date: new Date().toLocaleDateString('id-ID'),
          time: new Date().toLocaleTimeString('id-ID'),
          createdAt: new Date().toISOString(),
        })
      );
    } catch (_) {}

    return true;
  } catch (error) {
    console.error('Error deleting record from Firestore:', error);
    return false;
  }
}

/**
 * Two-way sync between local state and Firestore
 * Merges records without losing data.
 */
export async function syncTwoWayWithFirestore(
  localRecords: TelitianRecord[]
): Promise<{
  success: boolean;
  mergedRecords: TelitianRecord[];
  uploadedCount: number;
  downloadedCount: number;
  message: string;
}> {
  try {
    const remoteRecords = await fetchFirestoreRecords();

    const remoteMap = new Map<string, TelitianRecord>();
    for (const r of remoteRecords) {
      remoteMap.set(r.id, r);
    }

    const localMap = new Map<string, TelitianRecord>();
    for (const r of localRecords) {
      localMap.set(r.id, r);
    }

    let uploadedCount = 0;
    let downloadedCount = 0;

    // 1. Upload local items not present or newer than remote
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const local of localRecords) {
      const remote = remoteMap.get(local.id);
      if (!remote) {
        // Not in cloud yet: push to cloud
        const docRef = doc(db, 'records', local.id);
        batch.set(docRef, cleanForFirestore(local), { merge: true });
        uploadedCount++;
        batchCount++;
      } else {
        // Compare updatedAt if both exist
        const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
        const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
        if (localTime > remoteTime) {
          const docRef = doc(db, 'records', local.id);
          batch.set(docRef, cleanForFirestore(local), { merge: true });
          uploadedCount++;
          batchCount++;
        }
      }

      // Firestore limits batches to 500 operations
      if (batchCount >= 450) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // 2. Combine merged list: all local + any remote items that local doesn't have
    const mergedList: TelitianRecord[] = [...localRecords];
    for (const remote of remoteRecords) {
      if (!localMap.has(remote.id)) {
        mergedList.push(remote);
        downloadedCount++;
      }
    }

    // Sort by no or createdAt
    mergedList.sort((a, b) => (a.no || 0) - (b.no || 0));

    // Re-index cleanly
    mergedList.forEach((r, idx) => {
      r.no = idx + 1;
    });

    return {
      success: true,
      mergedRecords: mergedList,
      uploadedCount,
      downloadedCount,
      message: `Sinkronisasi Firebase Cloud sukses: ${uploadedCount} data diunggah, ${downloadedCount} data baru diunduh.`,
    };
  } catch (error: any) {
    console.error('Two-way sync error:', error);
    return {
      success: false,
      mergedRecords: localRecords,
      uploadedCount: 0,
      downloadedCount: 0,
      message: getErrorMessage(error, 'Gagal menyinkronkan dengan Firebase Cloud.'),
    };
  }
}

/**
 * Batch simpan beberapa records ke Firestore
 */
export async function batchSaveRecordsToFirestore(records: TelitianRecord[]): Promise<boolean> {
  if (!records || records.length === 0) return true;
  try {
    let batch = writeBatch(db);
    let count = 0;
    for (const rec of records) {
      if (!rec.id) continue;
      const docRef = doc(db, 'records', rec.id);
      batch.set(docRef, cleanForFirestore(rec), { merge: true });
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error('Error batch saving to Firestore:', err);
    return false;
  }
}

/**
 * Reset seluruh data records di Firestore (sinkron ke semua HP/Laptop)
 */
export async function resetFirestoreRecords(reason: string = 'Reset oleh Admin'): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const recordsCol = collection(db, 'records');
    const snapshot = await getDocs(recordsCol);
    let batch = writeBatch(db);
    let count = 0;
    let deletedCount = 0;

    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      count++;
      deletedCount++;
    });

    if (count > 0) {
      await batch.commit();
    }

    // Catat reset di app_settings
    try {
      await setDoc(
        doc(db, 'app_settings', 'last_reset'),
        cleanForFirestore({
          resetAt: new Date().toISOString(),
          resetBy: auth.currentUser?.email || auth.currentUser?.displayName || 'Admin',
          reason,
          deletedCount,
        }),
        { merge: true }
      );
    } catch (_) {}

    return { success: true, deletedCount };
  } catch (err) {
    console.error('Error resetting Firestore records:', err);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Sinkronisasi Dua Arah Real-time antara Google Spreadsheet & Firebase Firestore
 * 
 * Alur Kerja:
 * 1. Mengambil data terbaru langsung dari Google Sheets (via Apps Script Web App).
 * 2. Mencocokkan dengan data di Firestore.
 * 3. Jika ada baris baru / diperbarui di Google Sheets -> Simpan ke Firestore.
 * 4. Karena Firestore memiliki realtime listener, SEMUA HP & LAPTOP di seluruh domain
 *    otomatis menerima pembaruan secara instan (< 1 detik)!
 * 5. Jika ada data di Firestore yang belum masuk ke Google Sheets -> Kirim ke Google Sheets.
 */
export async function syncSpreadsheetWithFirestore(
  customGasUrl?: string,
  customSecret?: string
): Promise<{
  success: boolean;
  pulledFromSheets: number;
  pushedToSheets: number;
  totalRecords: number;
  message: string;
  error?: string;
  isHtmlLogin?: boolean;
}> {
  let gasUrl = (customGasUrl || getSavedGasUrl()).trim();
  let secret = (customSecret || getSavedGasSecret()).trim();

  // Jika URL belum tersimpan lokal, coba baca dari Firestore settings
  if (!gasUrl) {
    const cloudCfg = await fetchCloudSheetsConfig();
    if (cloudCfg?.googleAppsScriptUrl) {
      gasUrl = cloudCfg.googleAppsScriptUrl.trim();
      secret = cloudCfg.appsScriptSecret || secret;
    }
  }

  if (!gasUrl) {
    return {
      success: false,
      pulledFromSheets: 0,
      pushedToSheets: 0,
      totalRecords: 0,
      message: 'URL Google Apps Script belum diisi.',
      error: 'URL Google Apps Script belum diisi. Masukkan URL Web App di menu Backup & Excel atau Pengaturan.',
    };
  }

  try {
    // 1. Ambil data dari Google Sheets
    const sheetsResult = await fetchGasRecordsDirect(gasUrl, secret);
    if (!sheetsResult.success) {
      return {
        success: false,
        pulledFromSheets: 0,
        pushedToSheets: 0,
        totalRecords: 0,
        message: sheetsResult.error || 'Gagal menghubungi Google Sheets.',
        error: sheetsResult.error || 'Gagal menghubungi Google Sheets.',
        isHtmlLogin: sheetsResult.isHtmlLogin,
      };
    }

    const sheetsRecords: any[] = sheetsResult.records || [];

    // 2. Ambil data saat ini dari Firestore
    const currentFirestoreRecords = await fetchFirestoreRecords();
    const firestoreMap = new Map<string, TelitianRecord>();
    currentFirestoreRecords.forEach((r) => {
      if (r.id) firestoreMap.set(r.id, r);
    });

    const sheetsMap = new Map<string, any>();
    let pulledCount = 0;
    const recordsToUpdateInFirestore: TelitianRecord[] = [];

    // 3. Rekonsiliasi data dari Google Sheets ke Firestore
    sheetsRecords.forEach((sRec, idx) => {
      const recId = sRec.id || `gas_rec_${idx + 1}_${sRec.name ? sRec.name.replace(/\s+/g, '_') : 'guest'}`;
      sheetsMap.set(recId, sRec);

      const existing = firestoreMap.get(recId);
      const formatted: TelitianRecord = {
        id: recId,
        no: Number(sRec.no) || idx + 1,
        name: String(sRec.name || '').trim(),
        address: String(sRec.address || '').trim(),
        amount: Number(sRec.amount) || 0,
        dateInput: sRec.dateInput || sRec.tanggal || new Date().toLocaleDateString('id-ID'),
        timeInput: sRec.timeInput || sRec.waktu || new Date().toLocaleTimeString('id-ID') + ' WIB',
        createdAt: sRec.createdAt || existing?.createdAt || new Date().toISOString(),
        updatedAt: sRec.updatedAt || new Date().toISOString(),
        jenisTelitian: sRec.jenisTelitian || existing?.jenisTelitian || 'Uang',
        kategoriTamu: sRec.kategoriTamu || existing?.kategoriTamu || 'Umum',
        rincianBarang: sRec.rincianBarang || existing?.rincianBarang || '',
        petugas: sRec.petugas || existing?.petugas || 'Spreadsheet',
        statusValidasi: sRec.statusValidasi || existing?.statusValidasi || 'Tervalidasi',
      };

      if (!existing) {
        recordsToUpdateInFirestore.push(formatted);
        pulledCount++;
      } else {
        // Cek jika data di spreadsheet berbeda
        const isDifferent =
          existing.name !== formatted.name ||
          existing.address !== formatted.address ||
          existing.amount !== formatted.amount;

        if (isDifferent) {
          recordsToUpdateInFirestore.push({
            ...existing,
            ...formatted,
            updatedAt: new Date().toISOString(),
          });
          pulledCount++;
        }
      }
    });

    // Simpan data dari Google Sheets ke Firestore jika ada pembaruan
    if (recordsToUpdateInFirestore.length > 0) {
      await batchSaveRecordsToFirestore(recordsToUpdateInFirestore);
    }

    // 4. Periksa data di Firestore yang belum masuk ke Google Sheets
    const missingInSheets: TelitianRecord[] = [];
    currentFirestoreRecords.forEach((fRec) => {
      if (!sheetsMap.has(fRec.id)) {
        missingInSheets.push(fRec);
      }
    });

    let pushedCount = 0;
    if (missingInSheets.length > 0) {
      try {
        const pushRes = await batchCreateGasRecordsDirect(missingInSheets, gasUrl, secret);
        if (pushRes.success) {
          pushedCount = missingInSheets.length;
        }
      } catch (e) {
        console.warn('Gagal push sebagian data ke Sheets:', e);
      }
    }

    // 5. Update timestamp sinkronisasi di Firestore
    try {
      await saveCloudSheetsConfig({
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (_) {}

    const totalRecords = Math.max(sheetsRecords.length, currentFirestoreRecords.length);

    return {
      success: true,
      pulledFromSheets: pulledCount,
      pushedToSheets: pushedCount,
      totalRecords,
      message: `Sinkronisasi Sukses: ${pulledCount} data baru/update ditarik dari Spreadsheet, ${pushedCount} data dikirim ke Spreadsheet. Seluruh perangkat otomatis sinkron!`,
    };
  } catch (err: any) {
    console.error('Error during syncSpreadsheetWithFirestore:', err);
    return {
      success: false,
      pulledFromSheets: 0,
      pushedToSheets: 0,
      totalRecords: 0,
      message: getErrorMessage(err, 'Terjadi kesalahan sinkronisasi Spreadsheet.'),
      error: getErrorMessage(err, 'Terjadi kesalahan sinkronisasi Spreadsheet.'),
    };
  }
}

/**
 * Subscribe to real-time changes in Firestore
 */
export function subscribeToFirestore(
  onUpdate: (records: TelitianRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const recordsCol = collection(db, 'records');
  const q = query(recordsCol, orderBy('no', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: TelitianRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as TelitianRecord);
      });
      list.sort((a, b) => (a.no || 0) - (b.no || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore real-time listener error:', err);
      if (onError) onError(err);
    }
  );
}

