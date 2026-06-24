import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

describe('debug xlsx in vitest env', () => {
  it('round-trips sheet names', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['N. Emprunt', 'Designation'],
      ['006', 'Test'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Emprunts');
    console.log('before write:', wb.SheetNames);
    const buf = XLSX.write(wb, { type: 'buffer' });
    console.log('buf type:', buf.constructor.name, 'len:', buf.length);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const wb2 = XLSX.read(ab, { type: 'array', cellDates: true });
    console.log('after read:', wb2.SheetNames);
    expect(wb2.SheetNames).toContain('Emprunts');
  });
});
