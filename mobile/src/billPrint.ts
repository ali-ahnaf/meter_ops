import { File } from 'expo-file-system';
import * as Print from 'expo-print';

export type BillImage = { uri: string; mimeType: string };

type PrintOptions = { pages: BillImage[][]; c: number; rows: number; gap: number; margin: number };

// Same CSS as the web Bills page print styles (app/globals.css), so the PDF matches.
const css = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .a4-page { width: 210mm; height: 297mm; box-sizing: border-box; display: grid; break-after: page; overflow: hidden; }
  .a4-page:last-child { break-after: auto; }
  .cell { display: flex; align-items: center; justify-content: center; overflow: hidden; min-width: 0; min-height: 0; }
  .cell img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
`;

// ponytail: base64 inlines every image; very large batches may be slow or hit memory limits,
// downscale with expo-image-manipulator if that happens.
async function toDataUri(image: BillImage) {
  return `data:${image.mimeType};base64,${await new File(image.uri).base64()}`;
}

export async function printBills({ pages, c, rows, gap, margin }: PrintOptions) {
  const pageHtml = await Promise.all(
    pages.map(async (slice) => {
      const cells = await Promise.all(slice.map(async (image) => `<div class="cell"><img src="${await toDataUri(image)}" /></div>`));
      const style = `padding:${margin}px;gap:${gap}px;grid-template-columns:repeat(${c},1fr);grid-template-rows:repeat(${rows},1fr)`;
      return `<div class="a4-page" style="${style}">${cells.join('')}</div>`;
    }),
  );

  await Print.printAsync({
    html: `<!doctype html><html><head><meta charset="utf-8" /><style>${css}</style></head><body>${pageHtml.join('')}</body></html>`,
  });
}
