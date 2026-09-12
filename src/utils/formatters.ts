import { GuestEntry, HajatanEvent } from '../types';

export function formatRupiah(amount: number, hidePrivacy: boolean = false): string {
  if (hidePrivacy) {
    return 'Rp ••••••••';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseRupiahInput(value: string): number {
  const clean = value.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second note (harmonic fifth)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.55);
  } catch {
    // Audio may be blocked by browser policy until interaction
  }
}

export function exportToCsv(entries: GuestEntry[], event: HajatanEvent) {
  const headers = [
    'No. Registrasi',
    'Tanggal & Waktu',
    'Nama Tamu / Donatur',
    'Asal / Alamat',
    'Kategori Hubungan',
    'Status Kehadiran',
    'Dibawakan Oleh',
    'Metode Sumbangan',
    'Nominal (Rp)',
    'Deskripsi Kado',
    'Ucapan & Doa',
    'Petugas Meja',
  ];

  const rows = entries.map((entry) => [
    `"${entry.code}"`,
    `"${formatDateTime(entry.createdAt)}"`,
    `"${entry.guestName.replace(/"/g, '""')}"`,
    `"${(entry.cityOrAddress || '-').replace(/"/g, '""')}"`,
    `"${entry.relationship}"`,
    `"${entry.attendance === 'hadir' ? 'Hadir Langsung' : 'Titip Amplop'}"`,
    `"${(entry.broughtBy || '-').replace(/"/g, '""')}"`,
    `"${entry.paymentMethod.toUpperCase()}"`,
    entry.amount,
    `"${(entry.giftDescription || '-').replace(/"/g, '""')}"`,
    `"${(entry.greetings || '-').replace(/"/g, '""')}"`,
    `"${(entry.recordedBy || '-').replace(/"/g, '""')}"`,
  ]);

  const totalAmount = entries.reduce((acc, curr) => acc + curr.amount, 0);
  const footerRow = [
    '"TOTAL"',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    '""',
    totalAmount,
    '""',
    '""',
    '""',
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    `"REKAPITULASI KAS MASUK HAJATAN DIGITAL"\n` +
    `"Acara: ${event.eventName.replace(/"/g, '""')}"\n` +
    `"Tuan Rumah: ${event.hostName.replace(/"/g, '""')}"\n` +
    `"Tanggal Acara: ${event.eventDate}"\n\n` +
    [headers.join(','), ...rows.map((r) => r.join(',')), footerRow.join(',')].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const safeTitle = event.eventName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `Rekap_Uang_Masuk_Hajatan_${safeTitle}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const INITIAL_EVENT: HajatanEvent = {
  eventName: 'Resepsi Pernikahan Anisa & Dimas',
  hostName: 'Keluarga Bpk. H. Siswono & Ibu Hj. Sulastri',
  eventDate: '2026-09-12',
  location: 'Gedung Graha Kencana, Jakarta',
  targetBudget: 50000000,
  cashierName: 'Panitia Penerima Tamu Meja 1',
};

export const INITIAL_ENTRIES: GuestEntry[] = [
  {
    id: 'hjt-1',
    code: 'HJT-001',
    guestName: 'Bpk. Dr. H. Bambang Sutrisno & Ibu',
    cityOrAddress: 'Pondok Indah, Jakarta Selatan',
    relationship: 'Tamu VIP',
    paymentMethod: 'tunai',
    amount: 1000000,
    greetings: 'Selamat menempuh hidup baru Anisa & Dimas, semoga sakinah mawaddah warahmah.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-2',
    code: 'HJT-002',
    guestName: 'Ibu Hj. Fatimah Azzahra',
    cityOrAddress: 'Bandung',
    relationship: 'Keluarga',
    paymentMethod: 'transfer',
    amount: 500000,
    greetings: 'Barakallahu laka wa baraka alaika wa jamaa bainakuma fii khoir. Aamiin.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-3',
    code: 'HJT-003',
    guestName: 'Ir. Hendra Gunawan',
    cityOrAddress: 'PT Nusantara Jaya (Rekan Kerja Ayah)',
    relationship: 'Rekan Kerja',
    paymentMethod: 'tunai',
    amount: 300000,
    greetings: 'Selamat berbahagia untuk kedua mempelai dan keluarga besar.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 2.8).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-4',
    code: 'HJT-004',
    guestName: 'Bpk. Ahmad Fauzi (Pak RT 05)',
    cityOrAddress: 'Warga RT 05 / RW 03',
    relationship: 'Tetangga',
    paymentMethod: 'tunai',
    amount: 150000,
    greetings: 'Lancar berkah selalu seluruh rangkaian hajatannya.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 2.2).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-5',
    code: 'HJT-005',
    guestName: 'Keluarga Besar Bpk. H. Sukirno',
    cityOrAddress: 'Solo, Jawa Tengah',
    relationship: 'Besan / Kerabat',
    paymentMethod: 'tunai',
    amount: 2000000,
    greetings: 'Mugi langgeng rukun tentrem dumugi kaken ninen.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-6',
    code: 'HJT-006',
    guestName: 'Rian Pratama, S.Kom & Rombongan',
    cityOrAddress: 'Sahabat Kuliah Dimas (ITB 2018)',
    relationship: 'Sahabat',
    paymentMethod: 'qris',
    amount: 400000,
    greetings: 'Happy wedding bro Dimas & Sarah! Finally sah!',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 0.9).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-7',
    code: 'HJT-007',
    guestName: 'Ibu Ratna Dewi (Titip)',
    cityOrAddress: 'Surabaya',
    relationship: 'Keluarga',
    paymentMethod: 'tunai',
    amount: 350000,
    greetings: 'Mohon maaf belum bisa hadir langsung, titip doa terbaik.',
    attendance: 'titip',
    broughtBy: 'Dibawakan oleh Ibu Hj. Fatimah',
    createdAt: new Date(Date.now() - 3600000 * 0.4).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
  {
    id: 'hjt-8',
    code: 'HJT-008',
    guestName: 'drg. Maya Anggraini & Suami',
    cityOrAddress: 'RS Hermina',
    relationship: 'Rekan Kerja',
    paymentMethod: 'kado',
    amount: 0,
    giftDescription: 'Set Peralatan Masak Premium Oxone',
    greetings: 'Selamat berbahagia sahabatku Anisa, semoga langgeng bahagia selamanya.',
    attendance: 'hadir',
    createdAt: new Date(Date.now() - 3600000 * 0.1).toISOString(),
    recordedBy: 'Panitia Meja 1',
  },
];
