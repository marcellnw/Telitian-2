import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import { TelitianRecord } from '../types/record';
import { formatRupiah, formatDateTimeJakarta } from './currency';

/**
 * EXPORT KE MICROSOFT EXCEL (.xlsx)
 * Nama file: Telitian-Gibran-Kurniawan.xlsx
 */
export function exportToExcel(records: TelitianRecord[], totalUang: number) {
  const { date, time } = formatDateTimeJakarta();

  // Buat array data untuk worksheet dengan header profesional
  const wsData: (string | number)[][] = [
    ['BUKU PENDATAAN TELITIAN HAJATAN'],
    ['GIBRAN KURNIAWAN'],
    [`Waktu Export: ${date} - ${time}`],
    [], // Baris kosong pemisah
    ['No.', 'Nama Tamu', 'Alamat / Desa', 'Jumlah (Rp)', 'Tanggal Input', 'Jam Input'],
  ];

  records.forEach((record, index) => {
    wsData.push([
      record.no || index + 1,
      record.name,
      record.address || '-',
      Number(record.amount) || 0,
      record.dateInput || date,
      record.timeInput || time,
    ]);
  });

  // Baris kosong & Total
  wsData.push([]);
  wsData.push(['TOTAL DATA', `${records.length} Tamu / Amplop`]);
  wsData.push(['TOTAL UANG MASUK', Number(totalUang) || 0]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set lebar kolom optimal
  ws['!cols'] = [
    { wch: 8 },  // No
    { wch: 32 }, // Nama Tamu
    { wch: 28 }, // Alamat
    { wch: 20 }, // Jumlah
    { wch: 16 }, // Tanggal
    { wch: 14 }, // Jam
  ];

  // Terapkan format angka ke kolom Jumlah (Kolom D) dan Total Uang
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1');
  // Baris data dimulai dari index 4 (baris ke-5 di Excel)
  for (let R = 4; R <= 4 + records.length; R++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[cellAddress]) {
      ws[cellAddress].t = 'n';
      ws[cellAddress].z = '#,##0';
    }
  }

  // Format cell Total Uang (baris terakhir)
  const totalCellAddress = XLSX.utils.encode_cell({ r: range.e.r, c: 1 });
  if (ws[totalCellAddress] && typeof ws[totalCellAddress].v === 'number') {
    ws[totalCellAddress].t = 'n';
    ws[totalCellAddress].z = '#,##0';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DATA_TELITIAN');

  // Konversi workbook ke binary array buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const fileName = `Telitian-Gibran-Kurniawan_${date.replace(/\//g, '-')}.xlsx`;

  // Unduh dengan FileSaver (kompatibel penuh mobile & desktop & iframe)
  try {
    saveAs(blob, fileName);
  } catch (saveErr) {
    // Fallback anchor jika saveAs terhalang sandbox
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 150);
  }
}

/**
 * EXPORT KE MICROSOFT WORD (.docx)
 * Nama file: Telitian-Gibran-Kurniawan.docx
 */
export async function exportToWord(records: TelitianRecord[], totalUang: number) {
  const { date, time } = formatDateTimeJakarta();

  // Buat baris header tabel
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: '7C3AED' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'No.', bold: true, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: '7C3AED' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Nama Tamu', bold: true, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: '7C3AED' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Alamat', bold: true, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: '7C3AED' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Jumlah', bold: true, color: 'FFFFFF' })],
            }),
          ],
        }),
      ],
    }),
  ];

  // Tambahkan baris data
  records.forEach((rec, idx) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(idx + 1) })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: rec.name, bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: rec.address || '-' })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: formatRupiah(rec.amount), bold: true })],
              }),
            ],
          }),
        ],
      })
    );
  });

  // Buat Dokumen docx
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'PENDATAAN TELITIAN HAJATAN',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: 'GIBRAN KURNIAWAN',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `Tanggal Cetak: ${date} pukul ${time}`,
                italics: true,
                color: '666666',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: `TOTAL DATA : ${records.length} Orang`,
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `TOTAL UANG : ${formatRupiah(totalUang)}`,
                bold: true,
                size: 28,
                color: '7C3AED',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Telitian-Gibran-Kurniawan.docx');
}
