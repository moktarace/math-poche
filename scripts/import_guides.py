"""Import the supplied guides, retaining every page and its original visual.
Usage: python scripts/import_guides.py /path/PS.pdf /path/MS.pdf
Requires pdfplumber, pypdfium2 and Pillow. No instructions in PDFs are executed.
"""
from pathlib import Path
import sys, re, json, shutil
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def reflow_material(text):
 lines=[]
 for line in text.splitlines():
  line=line.strip()
  if not line or line=='Matériel':continue
  if line.startswith(('•','Matériel par')):lines.append(line)
  elif lines:lines[-1]+=' '+line
  else:lines.append(line)
 return '\n'.join(lines)
STARTS=list(range(35,71,6))+list(range(73,109,6))
DOMAINS=['Formes','Nombres','Nombres','Espace','Nombres','Motifs','Nombres','Grandeurs','Formes','Nombres','Formes','Espace']
MS_DOMAINS=['Nombres','Nombres','Formes','Nombres','Motifs','Espace','Nombres','Formes','Nombres','Grandeurs','Nombres','Espace']
def clean(t):
 t=re.sub(r'(?m)^.*(?:\.indd|__IINNTT__).*$','',t)
 t=re.sub(r'(\w)-\n(?=[a-zàâéèêëîïôùûüç])',r'\1',t)
 t=re.sub(r'(?m)^\d{1,3}\s*$','',t)
 return re.sub(r'\n{3,}','\n\n',t).strip()
def flat(t): return re.sub(r'\s+',' ',t).strip()
def between(t,a,b):
 m=re.search(a+'(.*?)'+b,t,re.S)
 return m.group(1).strip() if m else ''
catalog={'version':1,'sources':[],'sequences':[]}
for lv,src in zip(['ps','ms'],sys.argv[1:3]):
 out=ROOT/'public'/'pages'/lv;out.mkdir(parents=True,exist_ok=True)
 shutil.copyfile(src,ROOT/'public'/'guides'/f'{lv}.pdf')
 rendered=pdfium.PdfDocument(src)
 pages=[]
 with pdfplumber.open(src) as pdf:
  for i,p in enumerate(pdf.pages):
   # Discard only production footers and the narrow rotated publisher margin.
   text=clean(p.crop((53,0,p.width-22,p.height-48)).extract_text(use_text_flow=True) or '')
   materials=[]
   words=p.extract_words()
   headings=[w for w in words if w['text']=='Matériel']
   for box in p.rects+p.curves:
    color=box.get('non_stroking_color')
    if box['x0']<0 or box['top']<0 or box['x1']>p.width or box['bottom']>p.height:continue
    if not (box.get('fill') and 75<box['width']<275 and 20<box['height']<350 and isinstance(color,(tuple,list)) and len(color)==4 and color[3]==0 and 0<max(color[:3])<.35): continue
    if not any(box['x0']-8<w['x0']<box['x1'] and box['top']-32<w['top']<box['top']+10 for w in headings):continue
    material=clean(p.crop((box['x0'],box['top'],box['x1'],box['bottom'])).extract_text(use_text_flow=True) or '')
    if material and '•' in material:materials.append(material)
   pages.append({'number':i+1,'text':text,'image':f'pages/{lv}/{i+1}.webp','materials':list(dict.fromkeys(materials))})
   if not (out/f'{i+1}.webp').exists():
    bitmap=rendered[i].render(scale=1.9).to_pil().convert('RGB')
    bitmap.save(out/f'{i+1}.webp','WEBP',quality=76,method=4)
  (ROOT/'public'/'data'/f'{lv}.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
 for idx,start in enumerate(STARTS):
  t=pages[start-1]['text']
  title=flat(between(t,r'La semaine en un coup d’œil\s*',r'••'))
  goals=flat(between(t,r'OBJECTIFS? D[’\s]*APPRENTISSAGE',r'PÉRIODE'))
  activities=between(t,r'(• Jour 1)',r'Activités en classe entière')
  # Include the matched day marker, preserving source wording.
  m=re.search(r'• Jour 1.*?(?=Activités en classe entière)',t,re.S)
  collective=m.group(0).strip() if m else ''
  workshops=between(t,r'Activités en classe entière',r'Le coin maths')
  workshops=re.split(r'\n(?:Semaine \d|OBJECTIFS? D[’\s]*APPRENTISSAGE|PÉRIODE)',workshops)[0].strip()
  didactic=between(t,r'••',r'Le coin de l’enseignant')
  goal=between(pages[start+1]['text'],r'Objectif de la semaine',r'Jour 1')
  materials=[reflow_material(m) for p in pages[start:start+5] for m in p['materials']]
  directed=pages[start+2]['text']
  diff=between(directed,r'Différenciation',r'(?:Matériel|$)')
  flow=collective+'\n\nATELIERS\n'+workshops
  if not collective:flow=workshops
  catalog['sequences'].append({'id':f'{lv}-p{1 if idx<6 else 2}-s{idx%6+1}','level':lv.upper(),'period':1 if idx<6 else 2,'week':idx%6+1,'title':title,'domain':(DOMAINS if lv=='ps' else MS_DOMAINS)[idx],'start':start,'end':start+5,'objectives':goals,'summary':flat(goal) or goals,'didactic':didactic,'materials':'\n\n'.join(dict.fromkeys(materials)),'flow':flow,'differentiation':diff,'warning': 'La page 108 du guide MS reprend des activités de composition du nombre 4, alors que la séquence porte sur la représentation de la classe. Le contenu source est conservé ; vérifiez cette page avant de l’utiliser.' if lv=='ms' and start==103 else ''})
 catalog['sources'].append({'level':lv.upper(),'pages':len(pages),'file':f'guides/{lv}.pdf','name':f'Outils pour les Maths {lv.upper()}','publisher':'Magnard','year':2026 if lv=='ps' else 2025})
 print(lv,len(pages),'pages imported',flush=True)
(ROOT/'public'/'data'/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
for size in [192,512]:
 im=Image.new('RGB',(size,size),'#28594b');d=ImageDraw.Draw(im);s=size/100
 d.rounded_rectangle((24*s,30*s,76*s,70*s),radius=3*s,outline='#f9f4df',width=round(4*s));d.line((50*s,32*s,50*s,73*s),fill='#f9f4df',width=round(4*s));d.ellipse((59*s,17*s,77*s,35*s),fill='#edb95b')
 im.save(ROOT/'public'/'icons'/f'icon-{size}.png')

# Add mobile-friendly blocks using the manual’s actual frame geometry.
from manual_layout import enrich_manual
enrich_manual(catalog, sys.argv[1:3])
