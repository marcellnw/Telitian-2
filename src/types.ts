export type RelationshipCategory =
  | 'Keluarga'
  | 'Besan / Kerabat'
  | 'Sahabat'
  | 'Rekan Kerja'
  | 'Tetangga'
  | 'Tamu VIP'
  | 'Umum';

export type PaymentMethod = 'tunai' | 'transfer' | 'qris' | 'kado';

export type AttendanceType = 'hadir' | 'titip';

export interface GuestEntry {
  id: string;
  code: string; // e.g., HJT-001
  guestName: string;
  cityOrAddress: string;
  relationship: RelationshipCategory;
  paymentMethod: PaymentMethod;
  amount: number;
  giftDescription?: string;
  greetings?: string;
  attendance: AttendanceType;
  broughtBy?: string; // Jika titip, siapa yang membawakan
  session?: string;
  recordedBy?: string;
  createdAt: string; // ISO string
}

export interface HajatanEvent {
  eventName: string;
  hostName: string;
  eventDate: string;
  location: string;
  targetBudget?: number;
  cashierName?: string;
}

export interface KasSummary {
  grandTotal: number;
  totalTunai: number;
  totalTransfer: number;
  totalQris: number;
  totalKadoCount: number;
  totalKadoValue: number;
  totalGuests: number;
  totalHadir: number;
  totalTitip: number;
  averageAmount: number;
  highestAmount: number;
  lowestAmount: number;
}
