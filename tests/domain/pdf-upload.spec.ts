import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergeFiles } from '@/services/pdf/pdf-service';

function fileWithBytes(bytes: Uint8Array, name: string): File {
  const file = new File([bytes as BlobPart], name, { type: 'application/pdf' });
  // jsdom não implementa Blob.arrayBuffer; mantém os bytes reais da fixture.
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.slice().buffer });
  return file;
}

describe('PDF enviado para leitura remota', () => {
  it('mantém todos os bytes, inclusive texto e anotações, de um PDF único', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText('MATRICULA 123 - AREA 300 m2');
    const bytes = await pdf.save();
    const result = await mergeFiles([fileWithBytes(bytes, 'original.pdf')], undefined, true);
    expect(result).toEqual(bytes);
  });

  it('mantém ordem e dimensões das páginas quando junta PDFs', async () => {
    const a = await PDFDocument.create(); a.addPage([400, 600]);
    const b = await PDFDocument.create(); b.addPage([700, 900]); b.addPage([800, 1000]);
    const merged = await mergeFiles([
      fileWithBytes(await a.save(), 'a.pdf'), fileWithBytes(await b.save(), 'b.pdf'),
    ], undefined, true);
    const result = await PDFDocument.load(merged);
    expect(result.getPages().map((page) => page.getSize())).toEqual([
      { width: 400, height: 600 }, { width: 700, height: 900 }, { width: 800, height: 1000 },
    ]);
  });
});
