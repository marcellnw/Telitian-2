export type RecordSyncStatus = 'synced' | 'pending' | 'pending-create' | 'pending-update' | 'pending-delete' | 'sync-error';

export interface TelitianRecord {
  id: string;
  no: number;
  name: string;
  address: string;
  amount: number;
  dateInput: string;
  timeInput: string;
  createdAt: string;
  updatedAt: string;
  jenisTelitian?: string;
  kategoriTamu?: string;
  rincianBarang?: string;
  petugas?: string;
  statusValidasi?: string;
  syncStatus?: RecordSyncStatus;
  isOffline?: boolean;
}

export interface StatsData {
  totalData: number;
  totalUang: number;
  lastInputTime: string;
  highestAmount: number;
  averageAmount: number;
}

export interface ActivityLog {
  date: string;
  time: string;
  activity: string;
  recordId: string;
  name: string;
  note: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  totalData?: number;
  totalUang?: number;
  isOfflineCache?: boolean;
}
