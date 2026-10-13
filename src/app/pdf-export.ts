import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { Preparation, Sequence } from './models';
import { preparationSections, exportPalette, exportFilename, displayDate, sourceCaption, type ExportSection } from './export-model';
import { download } from './file-download';
export { download } from './file-download';
const W=595.28,H=841.89,M=38,CW=W-2*M,BOTTOM=57;
const color=(hex:string)=>rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
const ink=color('30343A'),muted=color('64605A'),white=rgb(1,1,1);
interface FontBytes {regular:Uint8Array;bold:Uint8Array;}
async function loadFonts():Promise<FontBytes>{
 const bytes=await Promise.all(['Regular','Bold'].map(async style=>{const r=await fetch(`fonts/LiberationSans-${style}.ttf`);if(!r.ok)throw Error('Police indisponible');return new Uint8Array(await r.arrayBuffer());}));
 return {regular:bytes[0],bold:bytes[1]};
}
export async function createPreparationPdf(prep:Preparation,seq:Sequence,fontBytes?:FontBytes):Promise<Uint8Array>{
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const fontData=fontBytes||await loadFonts();
 const regular=await pdf.embedFont(fontData.regular,{subset:true}),bold=await pdf.embedFont(fontData.bold,{subset:true});
 pdf.setTitle(prep.title);pdf.setAuthor('Maths en poche');pdf.setSubject(`Fiche de séquence personnelle · ${sourceCaption(seq)}`);
 let page:PDFPage,y=0;const supported=new Set(regular.getCharacterSet());
 const safe=(text:string)=>Array.from(text.replace(/\r/g,'').replace(/\t/g,'  ').replace(/[\u00a0\u202f]/g,' ').replace(/[\u2010-\u2014]/g,'-')).map(c=>supported.has(c.codePointAt(0)!)?c:'□').join('');
 function wrap(text:string,size:number,font:PDFFont,width:number):string[]{
  const out:string[]=[];
  for(const p of text.split('\n')){let line='';for(const word of safe(p).split(/ +/)){
   if(font.widthOfTextAtSize(line?line+' '+word:word,size)<=width){line=line?line+' '+word:word;continue;}
   if(line)out.push(line);line='';
   for(const c of word){if(font.widthOfTextAtSize(line+c,size)>width&&line){out.push(line);line='';}line+=c;}
  }out.push(line);}return out;
 }
 const draw=(text:string,x:number,baseline:number,size=11,font=regular,c=ink)=>page.drawText(safe(text),{x,y:baseline,size,font,color:c});
 function newPage(){
  page=pdf.addPage([W,H]);y=H-57;
  page.drawRectangle({x:0,y:H-8,width:W,height:8,color:color('EEB525')});
  if(pdf.getPageCount()>1){draw(`FICHE DE SÉQUENCE · ${seq.level} · PÉRIODE ${seq.period} · SEMAINE ${seq.week}`,M,H-30,8.5,bold,color('B65317'));y=H-55;}
 }
 newPage();
 const titleLines=wrap(prep.title||'Fiche de séquence',23,bold,CW-104);
 const mainTitle=titleLines.slice(0,5);const titleHeight=Math.max(92,mainTitle.length*28+34);
 page!.drawRectangle({x:M,y:y-titleHeight,width:CW,height:titleHeight,color:color('FFF5DB')});
 page!.drawCircle({x:M+43,y:y-43,size:31,color:color('B65317')});
 draw('PÉRIODE',M+23,y-30,8,bold,white);draw(String(seq.period),M+34,y-57,27,bold,white);
 draw(`Semaine ${seq.week}`,M+18,y-89,9,bold,color('B65317'));
 draw(`FICHE DE SÉQUENCE · ${seq.level}`,M+100,y-18,8.5,bold,color('8D5E00'));
 mainTitle.forEach((line,i)=>draw(line,M+100,y-46-i*28,23,bold,color('B65317')));y-=titleHeight+17;
 const info=[`Classe : ${prep.classroom||'À préciser'}    ·    Date : ${displayDate(prep.date)}`,`Durée / organisation : ${prep.duration||'À préciser'}`,`Domaine : ${seq.domain}`];
 for(const text of [...titleLines.slice(5),...info])for(const line of wrap(text,10,regular,CW)){if(y<80)newPage();draw(line,M,y,10);y-=15;}
 y-=10;
 type Line={text:string;size:number;font:PDFFont;indent:number;height:number;accent:boolean;block:number;};
 function section(s:ExportSection){
  const palette=exportPalette[s.theme],accent=color(palette.ink),pale=color(palette.pale);
  const all:Line[]=[];
  s.blocks.forEach((block,index)=>{
   if(!block.text){all.push({text:'',size:10,font:regular,indent:0,height:7,accent:false,block:index});return;}
   const strong=block.kind==='heading'||block.kind==='objective';const font=strong?bold:regular;
   const size=block.kind==='heading'?11.2:10.7;const indent=block.kind==='bullet'?12:0;
   const lines=wrap(block.text,size,font,CW-30-indent);
   if(block.kind==='heading'&&all.length)all.push({text:'',size,font,indent:0,height:6,accent:false,block:index});
   lines.forEach((line,i)=>all.push({text:(block.kind==='bullet'&&i===0?'• ':'')+line,size,font,indent,height:size*1.45,accent:strong,block:index}));
   all.push({text:'',size,font,indent:0,height:4,accent:false,block:index});
  });
  let start=0,continued=false;
  while(start<all.length){
   if(y-BOTTOM<88)newPage();
   const available=y-BOTTOM-44;let end=start,height=0;
   while(end<all.length&&height+all[end].height<=available){height+=all[end].height;end++;}
   // Keep a short paragraph together, and avoid leaving a subheading at the foot.
   if(end<all.length&&end>start){
    const tail=all[end-1].block;let first=end-1;while(first>start&&all[first-1].block===tail)first--;
    const total=all.filter(l=>l.block===tail).reduce((n,l)=>n+l.height,0);
    if(first>start&&(total<105||s.blocks[tail]?.kind==='heading'))end=first;
   }
   while(end>start&&!all[end-1].text)end--;
   if(end===start){start++;continue;}
   height=all.slice(start,end).reduce((n,l)=>n+l.height,0);
   const boxHeight=height+42;const solid=s.theme==='orange';
   page.drawRectangle({x:M,y:y-boxHeight,width:CW,height:boxHeight,color:solid?accent:white,borderColor:accent,borderWidth:.7});
   if(!solid)page.drawRectangle({x:M+.4,y:y-28,width:CW-.8,height:27.6,color:pale});
   draw(s.title+(continued?' (suite)':''),M+14,y-18,12,bold,solid?white:accent);
   let baseline=y-44;
   for(const line of all.slice(start,end)){if(line.text)draw(line.text,M+14+line.indent,baseline,line.size,line.font,solid?white:line.accent?accent:ink);baseline-=line.height;}
   y-=boxHeight+17;start=end;while(start<all.length&&!all[start].text)start++;
   if(start<all.length){newPage();continued=true;}
  }
 }
 for(const s of preparationSections(prep))section(s);
 if(seq.warning)section({title:'Repère du guide',theme:'gold',blocks:[{kind:'paragraph',text:seq.warning}]});
 const total=pdf.getPageCount();
 pdf.getPages().forEach((p,i)=>{
  page=p;
  page.drawLine({start:{x:M,y:42},end:{x:W-M,y:42},color:color('DED7C9'),thickness:.5});
  draw(`Source : ${sourceCaption(seq)}`,M,29,7.5,regular,muted);
  draw('Fiche personnelle · Maths en poche',M,18,7.5,regular,muted);
  draw(`${i+1} / ${total}`,W-M-28,25,8.5,bold,color('8D5E00'));
 });
 return pdf.save();
}
export async function exportPreparation(prep:Preparation,seq:Sequence):Promise<void>{download(await createPreparationPdf(prep,seq),`fiche-${seq.level.toLowerCase()}-${exportFilename(prep.title)}.pdf`,'application/pdf');}
export async function exportSourcePages(seq:Sequence):Promise<void>{
 const response=await fetch(`guides/${seq.level.toLowerCase()}.pdf`);if(!response.ok)throw Error('Guide indisponible');
 const source=await PDFDocument.load(await response.arrayBuffer());const output=await PDFDocument.create();
 const pages=await output.copyPages(source,Array.from({length:seq.end-seq.start+1},(_,i)=>seq.start-1+i));pages.forEach(p=>output.addPage(p));
 output.setTitle(`${seq.level} — ${seq.title}`);download(await output.save(),`guide-${seq.id}.pdf`,'application/pdf');
}
