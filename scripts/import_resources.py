"""Import the supplied "Ressources" (bloc-ressources) books: render every page to WebP.
Usage: python scripts/import_resources.py /path/ressources-PS.pdf /path/ressources-MS.pdf
Requires pypdfium2 and Pillow. No instructions in PDFs are executed.
"""
from pathlib import Path
import sys, shutil
import pypdfium2 as pdfium
ROOT = Path(__file__).resolve().parents[1]
# Physical PDF page = printed page shown on the sheet + offset (verified visually per level).
OFFSET = {'ps': 1, 'ms': 0}
for lv, src in zip(['ps', 'ms'], sys.argv[1:3]):
 out = ROOT / 'public' / 'pages' / f'ressources-{lv}'
 out.mkdir(parents=True, exist_ok=True)
 shutil.copyfile(src, ROOT / 'public' / 'guides' / f'ressources-{lv}.pdf')
 doc = pdfium.PdfDocument(src)
 last = 0
 for i in range(len(doc)):
  printed = i + 1 - OFFSET[lv]
  if printed < 1:
   continue
  bitmap = doc[i].render(scale=1.6).to_pil().convert('RGB')
  bitmap.save(out / f'{printed}.webp', 'WEBP', quality=78, method=4)
  last = printed
 print(lv, len(doc), 'pages,', last, 'printed pages rendered', flush=True)
