"""Recover the manual's visual sections from its PDF geometry and typography.
The original text and page images remain available independently of this layout.
"""
from pathlib import Path
import json, re, sys
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
COLORS = {'rituals':(.55,.1,0,0),'collective':(.4,0,.85,0),'workshops':(.5,.6,0,0)}

def color_is(value, wanted):
    return isinstance(value,(tuple,list)) and len(value)==len(wanted) and all(abs(a-b)<.006 for a,b in zip(value,wanted))

def bounds(b): return (b['x0'],b['top'],b['x1'],b['bottom'])
def contains(b,c,pad=0):
    x=(c['x0']+c['x1'])/2;y=(c['top']+c['bottom'])/2
    return b[0]-pad<=x<=b[2]+pad and b[1]-pad<=y<=b[3]+pad

def clean(text):
    text=re.sub(r'(\w)-\n(?=[a-zàâéèêëîïôùûüç])',r'\1',text)
    # PDF bullet kerning can split the first letter from its word.
    text=re.sub(r'(?m)^(•\s*)([A-ZÀ-Ÿ])\s+(?=[a-zà-ÿ])',r'\1\2',text)
    return re.sub(r'Jo\s+ur','Jour',text).strip()

def flat(text):
    text=re.sub(r'\s+',' ',clean(text)).strip()
    return re.sub(r'(^|Jour \d )(C|N|L|P|D|E) (?=[a-z])',r'\1\2',text)
def crop_text(page,bbox):
    return clean(page.crop(bbox).extract_text(x_tolerance=1.5) or '')

def overview(page):
    boxes=page.rects+page.curves
    result={}
    for key,color in COLORS.items():
        matches=[b for b in boxes if b.get('stroke') and color_is(b.get('stroking_color'),color) and b['width']>140 and b['height']>35]
        if not matches:raise ValueError(f'Missing {key} on page {page.page_number}')
        b=max(matches,key=lambda b:b['width']*b['height'])
        result[key]=crop_text(page,(b['x0']+2,b['top']+9,b['x1']-2,b['bottom']+1))
    pink=[b for b in boxes if b.get('fill') and color_is(b.get('non_stroking_color'),(0,.08,0,0)) and b['width']>100 and b['height']>30]
    if not pink:raise ValueError(f'Missing maths corner on page {page.page_number}')
    b=max(pink,key=lambda b:b['width']*b['height'])
    result['mathCorner']=crop_text(page,(b['x0']+2,b['top']+8,b['x1']-2,b['bottom']+2))
    # Explicit role delimiters keep a following workshop title out of its objective.
    workshops=[]
    for match in re.finditer(r'(Dirigé|Semi-dirigé|Autonome(?: [12])?|Mon cahier de maths)\s+([\s\S]*?)(?=\n(?:Dirigé|Semi-dirigé|Autonome(?: [12])?|Mon cahier de maths)\b|$)',result['workshops']):
        title,_,goal=match[2].partition('Objectif')
        if match[1]=='Mon cahier de maths' and not goal.strip() and workshops:
            workshops[-1]['note']='Mon cahier de maths '+flat(title)
        else:
            workshops.append({'label':match[1],'title':flat(title),'objective':flat(goal).lstrip(': ')})
    result['workshops']=workshops
    days=[]
    for m in re.finditer(r'•\s*Jour\s*(\d)\s+([\s\S]*?)(?=\n•\s*Jour|$)',result.pop('collective')):
        days.append({'number':int(m[1]),'title':flat(m[2])})
    result['days']=days
    result['rituals']=[flat(x) for x in re.split(r'•\s*',result['rituals']) if x.strip()]
    title,_,goal=result['mathCorner'].partition('Objectif')
    result['mathCorner']={'title':flat(title),'objective':flat(goal).lstrip(': ')}
    return result

def material_boxes(page):
    headings=[w for w in page.extract_words() if w['text']=='Matériel']
    result=[]
    for b in page.rects+page.curves:
        color=b.get('non_stroking_color')
        if not (b.get('fill') and 65<b['width']<280 and 20<b['height']<350 and isinstance(color,(tuple,list)) and len(color)==4 and color[3]==0 and 0<max(color[:3])<.35):continue
        if not any(b['x0']-8<w['x0']<b['x1'] and b['top']-32<w['top']<b['top']+10 for w in headings):continue
        bb=(b['x0']-1,b['top']-3,b['x1']+1,b['bottom']+1)
        if not any(abs(bb[0]-r[0])<2 and abs(bb[1]-r[1])<2 for r in result):result.append(bb)
    return result

def blocks(page,bbox,exclusions=()):
    # Small text inside reproduced worksheets and rotated running headers are not
    # lesson prose. They remain intact in the original page image.
    def keep(c):
        return c['object_type']!='char' or (c.get('upright') and c['size']>=8 and ('Myriad' in c['fontname'] or 'Adesso' in c['fontname']) and not any(contains(b,c) for b in exclusions))
    lines=page.crop(bbox).filter(keep).extract_text_lines(x_tolerance=1.5)
    out=[];pending=None;last_bottom=0
    for line in lines:
        text=clean(line['text'])
        if not text:continue
        chars=[c for c in line['chars'] if c['text'].strip()]
        italic=sum('It' in c['fontname'] for c in chars)>len(chars)*.65
        kind='quote' if italic else 'paragraph'
        if re.match(r'^(Préparation|Déroulement|Différenciation|Prolongements? possibles?)$',text):kind='heading'
        elif re.match(r'^Étape\b',text):kind='step'
        elif re.match(r'^(Objectif|Qu’avons-nous appris)',text):kind='objective'
        elif text.startswith(('•','–')):kind='item';text=re.sub(r'^[•–]\s*','',text)
        split=kind in ('heading','step','item','objective') or pending is None or (pending['kind'] in ('heading','step')) or line['top']-last_bottom>8 or (kind=='quote' and pending['kind']=='paragraph') or (kind=='paragraph' and pending['kind']=='quote')
        if split:
            pending={'kind':kind,'text':text};out.append(pending)
        else:
            join='' if pending['text'].endswith('-') and re.match(r'[a-zà-ÿ]',text) else ' '
            if not join:pending['text']=pending['text'][:-1]
            pending['text']+=join+text
        last_bottom=line['bottom']
    return out

def detailed(page,offset):
    theme='rituals' if offset==1 else 'collective' if offset==2 else 'workshops'
    title={'rituals':'Rituels','collective':'Activités en classe entière','workshops':'Ateliers'}[theme]
    mats=material_boxes(page)
    sections=[]
    if offset==1:
        # Blue rounded frames are the actual ritual columns, followed by Énigme.
        frames=[b for b in page.rects+page.curves if b.get('stroke') and color_is(b.get('stroking_color'),COLORS['rituals']) and b['width']>140 and b['height']>45]
        frames.sort(key=lambda b:(round(b['top']/20),b['x0']))
        regions=[(b['x0'],b['top']-12,b['x1']+5,b['bottom']+1) for b in frames]
    else:
        heading_page=page.filter(lambda c:c['object_type']!='char' or (c['upright'] and 12.7<=c['size']<=15.1 and c['x0']>75 and c['top']<825))
        headings=heading_page.extract_text_lines(x_tolerance=1.5)
        # Wrapped titles and the maths-corner title/subtitle belong together.
        groups=[]
        for h in headings:
            if not re.search(r'[A-Za-zÀ-ÿ]',h['text']):continue
            if groups and h['top']-groups[-1]['bottom']<17:
                groups[-1]['text']+=' '+h['text'];groups[-1]['bottom']=h['bottom']
            else:groups.append(dict(h))
        regions=[(78,h['top']-3,590,(groups[i+1]['top']-14 if i+1<len(groups) else 828)) for i,h in enumerate(groups)]
    owners={}
    for b in mats:
        candidates=[i for i,r in enumerate(regions) if r[0]-3<=b[0]<r[2]]
        if candidates:owners[b]=min(candidates,key=lambda i:abs(regions[i][1]-b[1]))
    for index,region in enumerate(regions):
        x0,y0,x1,y1=region
        title_page=page.crop(region).filter(lambda c:c['object_type']!='char' or (c.get('upright') and 12.7<=c['size']<=15.1))
        title_lines=title_page.extract_text_lines(x_tolerance=1.5)
        if not title_lines:continue
        section_title=flat(' '.join(l['text'] for l in title_lines))
        body_top=max(l['bottom'] for l in title_lines)+1
        body_region=(x0,body_top,x1,y1)
        own_mats=[b for b in mats if owners.get(b)==index]
        material_texts=[crop_text(page,b) for b in own_mats]
        section_theme='maths' if section_title.startswith('Le coin maths') else 'overview' if section_title.startswith('Prolongement') else theme
        text_blocks=blocks(page,body_region,mats)
        if offset==1:
            # Four-column Énigme tables must be read column by column on a phone.
            tables=[t for t in page.find_tables() if y0<t.bbox[1]<y1 and t.bbox[2]-t.bbox[0]>300 and t.bbox[3]-t.bbox[1]>35 and len(t.rows[0].cells) in (3,4)]
            if tables:
                text_blocks=[];cursor=body_top
                for table in sorted(tables,key=lambda t:t.bbox[1]):
                    text_blocks.extend(blocks(page,(x0,cursor,x1,table.bbox[1]),mats))
                    cells=[c for c in table.rows[0].cells if c]
                    column_width=(cells[0][2]-cells[0][0])
                    # Some PDF borders are disconnected; recover the fourth column
                    # only when its actual day heading is present to the right.
                    count=len(cells)
                    header=crop_text(page,(table.bbox[0],table.bbox[1],min(590,table.bbox[0]+4*column_width),table.bbox[1]+30))
                    if 'Jour 4' in header:count=4
                    columns=[crop_text(page,(table.bbox[0]+j*column_width,table.bbox[1],table.bbox[0]+(j+1)*column_width,table.bbox[3])) for j in range(count)]
                    text_blocks.append({'kind':'table','columns':columns})
                    cursor=table.bbox[3]
                text_blocks.extend(blocks(page,(x0,cursor,x1,y1),mats))
        sections.append({'title':section_title,'theme':section_theme,'blocks':text_blocks,'materials':material_texts})
    return {'title':title,'theme':theme,'sections':sections}

def enrich_manual(catalog, sources):
    for level,src in zip(['ps','ms'],sources):
        data_path=ROOT/'public/data'/f'{level}.json'
        pages=json.loads(data_path.read_text())
        with pdfplumber.open(src) as pdf:
            for sequence in [s for s in catalog['sequences'] if s['level'].lower()==level]:
                sequence['manual']=overview(pdf.pages[sequence['start']-1])
                assert len(sequence['manual']['days'])==4,sequence['id']
                assert len(sequence['manual']['workshops'])>=3,sequence['id']
                for offset in range(1,6):
                    i=sequence['start']+offset-1
                    pages[i]['manual']=detailed(pdf.pages[i],offset)
                    assert pages[i]['manual']['sections'],(level,i+1)
        data_path.write_text(json.dumps(pages,ensure_ascii=False))
        print(level,'manual sections extracted',flush=True)
    (ROOT/'public/data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))

if __name__=='__main__':
    enrich_manual(json.loads((ROOT/'public/data/catalog.json').read_text()),sys.argv[1:3])
