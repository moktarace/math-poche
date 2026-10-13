import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, LevelFormat, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import type { IRunOptions, IParagraphOptions } from 'docx';
import type { Preparation, Sequence } from './models';
import { preparationSections, exportPalette, exportFilename, displayDate, sourceCaption, resourcePageNumbers } from './export-model';
import { download } from './file-download';
const FONT='Liberation Sans';
const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const noBorders={top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder};
/** Convert a cached WebP page to PNG bytes for embedding; unavailable outside a browser. */
async function webpToPng(path:string):Promise<{data:Uint8Array;width:number;height:number}|null>{
 if(typeof document==='undefined'||typeof createImageBitmap==='undefined')return null;
 try{
  const response=await fetch(path);
  if(!response.ok)return null;
  const bitmap=await createImageBitmap(await response.blob());
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.drawImage(bitmap,0,0);
  const blob:Blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('toBlob')),'image/png'));
  return {data:new Uint8Array(await blob.arrayBuffer()),width:bitmap.width,height:bitmap.height};
 }catch{return null;}
}
const resourcePagePng=(level:string,printed:number)=>webpToPng(`pages/ressources-${level.toLowerCase()}/${printed}.webp`);
const docText=(value:string,options:IRunOptions={})=>new TextRun({text:value,font:FONT,...options});
const docLine=(value:string,runOptions:IRunOptions={},options:IParagraphOptions={})=>new Paragraph({children:[docText(value,runOptions)],...options});
const docHeading=(title:string,theme:keyof typeof exportPalette)=>{
 const palette=exportPalette[theme];
 return new Paragraph({
  heading:HeadingLevel.HEADING_1,children:[docText(title,{bold:true,color:palette.ink,size:25})],
  keepNext:true,spacing:{before:230,after:140,line:300},indent:{left:160,right:160},
  shading:{fill:palette.pale,type:ShadingType.CLEAR},border:{left:{color:palette.ink,style:BorderStyle.SINGLE,size:15,space:8}}
 });
};
const docBullet=(value:string)=>docLine(value,{size:22},{numbering:{reference:'manual-bullets',level:0},spacing:{after:70,line:290}});
/** Reconstructed text layout of the overview tab for one sequence (no resources). */
function sequenceOverviewChildren(seq:Sequence,pageBreakBefore=false):(Paragraph|Table)[]{
 const children:(Paragraph|Table)[]=[];
 if(pageBreakBefore)children.push(new Paragraph({pageBreakBefore:true,children:[]}));
 children.push(new Table({width:{size:10384,type:WidthType.DXA},columnWidths:[1650,8734],layout:TableLayoutType.FIXED,borders:noBorders,rows:[new TableRow({children:[
  new TableCell({width:{size:1650,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill:'B65317',type:ShadingType.CLEAR},margins:{top:180,bottom:180,left:100,right:100},children:[
   new Paragraph({alignment:AlignmentType.CENTER,children:[docText('PÉRIODE',{size:18,bold:true,color:'FFFFFF'})]}),
   new Paragraph({alignment:AlignmentType.CENTER,children:[docText(String(seq.period),{size:56,bold:true,color:'FFFFFF'})],spacing:{after:90}}),
   new Paragraph({alignment:AlignmentType.CENTER,children:[docText(`Semaine ${seq.week}`,{size:19,bold:true,color:'FFFFFF'})]})
  ]}),
  new TableCell({width:{size:8734,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill:'FFF5DB',type:ShadingType.CLEAR},margins:{top:180,bottom:180,left:260,right:220},children:[
   new Paragraph({children:[docText(`OUTILS POUR LES MATHS · ${seq.level}`,{size:17,bold:true,color:'8D5E00'})],spacing:{after:130}}),
   new Paragraph({heading:HeadingLevel.TITLE,children:[docText(seq.title||'Séquence',{size:44,bold:true,color:'B65317'})],spacing:{after:0},keepNext:false})
  ]})
 ]})]}));
 children.push(docLine(`Domaine : ${seq.domain}`,{},{spacing:{before:220,after:200}}));
 children.push(docHeading('Objectifs d’apprentissage','orange'));
 for(const goal of seq.objectives.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ÿ])/).filter(Boolean))children.push(docBullet(goal));
 if(seq.didactic){
  children.push(docHeading('Le coin de l’enseignant·e','gold'));
  for(const paragraph of seq.didactic.split('\n').map(p=>p.trim()).filter(Boolean))children.push(docLine(paragraph,{size:22},{spacing:{after:110,line:290}}));
 }
 const m=seq.manual;
 if(m){
  children.push(docHeading('Rituels','blue'));
  for(const ritual of m.rituals)children.push(docBullet(ritual));
  children.push(docHeading('Activités en classe entière','green'));
  for(const day of m.days)children.push(docLine(`Jour ${day.number} — ${day.title}`,{bold:true,size:22},{spacing:{after:80}}));
  children.push(docHeading('Ateliers','purple'));
  for(const workshop of m.workshops){
   children.push(docLine(`${workshop.label} — ${workshop.title}`,{bold:true,size:22},{spacing:{before:100,after:20}}));
   children.push(docLine(`Objectif : ${workshop.objective}`,{size:21,color:'4A4F45'},{spacing:{after:workshop.note?20:100}}));
   if(workshop.note)children.push(docLine(workshop.note,{italics:true,size:20,color:'64605A'},{spacing:{after:100}}));
  }
  children.push(docHeading('Le coin maths','pink'));
  children.push(docLine(m.mathCorner.title,{bold:true,size:22},{spacing:{after:20}}));
  children.push(docLine(`Objectif : ${m.mathCorner.objective}`,{size:21,color:'4A4F45'},{spacing:{after:140}}));
 }
 if(seq.warning)children.push(docLine(seq.warning,{italics:true,size:20,color:'8D5E00'},{shading:{fill:'FFF5DB',type:ShadingType.CLEAR},indent:{left:160,right:160},spacing:{before:140,after:140}}));
 return children;
}
/** Cited resource pages as images, from the source PDF (via cached WebP renders). */
async function resourcesSectionChildren(level:string,pages:number[]):Promise<(Paragraph|Table)[]>{
 if(!pages.length)return [];
 const children:(Paragraph|Table)[]=[new Paragraph({
  heading:HeadingLevel.HEADING_1,children:[docText('Ressources',{bold:true,color:'FFFFFF',size:25})],
  keepNext:true,spacing:{before:230,after:140,line:300},indent:{left:160,right:160},
  shading:{fill:'2C7195',type:ShadingType.CLEAR},border:{left:{color:'2C7195',style:BorderStyle.SINGLE,size:15,space:8}}
 })];
 for(const pageNumber of pages){
  const image=await resourcePagePng(level,pageNumber);
  if(!image)continue;
  const maxWidth=560,scale=Math.min(1,maxWidth/image.width);
  children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80,after:30},children:[new ImageRun({type:'png',data:image.data,transformation:{width:Math.round(image.width*scale),height:Math.round(image.height*scale)}})]}));
  children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:160},children:[docText(`Ressources, p. ${pageNumber}`,{size:16,color:'64605A'})]}));
 }
 return children;
}
async function packDocument(children:(Paragraph|Table)[],title:string,description:string):Promise<Uint8Array>{
 const document=new Document({
  creator:'Maths en poche',title,description,
  styles:{default:{document:{run:{font:FONT,size:22,color:'30343A'},paragraph:{spacing:{after:85,line:290}}}}},
  numbering:{config:[{reference:'manual-bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:260,hanging:180}},run:{font:FONT}}}]}]},
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:760,bottom:900,left:760,right:760,header:300,footer:360}}},children}]
 });
 return new Uint8Array(await Packer.toArrayBuffer(document));
}
export async function createPreparationDocx(prep:Preparation,seq:Sequence):Promise<Uint8Array>{
 const children:(Paragraph|Table)[]=[];
 const text=(value:string,options:IRunOptions={})=>new TextRun({text:value,font:FONT,...options});
 const p=(value:string,options:IParagraphOptions={})=>new Paragraph({children:[text(value)],...options});
 children.push(new Table({width:{size:10384,type:WidthType.DXA},columnWidths:[1650,8734],layout:TableLayoutType.FIXED,borders:noBorders,rows:[new TableRow({children:[
  new TableCell({width:{size:1650,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill:'B65317',type:ShadingType.CLEAR},margins:{top:180,bottom:180,left:100,right:100},children:[
   new Paragraph({alignment:AlignmentType.CENTER,children:[text('PÉRIODE',{size:18,bold:true,color:'FFFFFF'})]}),
   new Paragraph({alignment:AlignmentType.CENTER,children:[text(String(seq.period),{size:56,bold:true,color:'FFFFFF'})],spacing:{after:90}}),
   new Paragraph({alignment:AlignmentType.CENTER,children:[text(`Semaine ${seq.week}`,{size:19,bold:true,color:'FFFFFF'})]})
  ]}),
  new TableCell({width:{size:8734,type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill:'FFF5DB',type:ShadingType.CLEAR},margins:{top:180,bottom:180,left:260,right:220},children:[
   new Paragraph({children:[text(`FICHE DE SÉQUENCE · ${seq.level}`,{size:17,bold:true,color:'8D5E00'})],spacing:{after:130}}),
   new Paragraph({heading:HeadingLevel.TITLE,children:[text(prep.title||'Fiche de séquence',{size:44,bold:true,color:'B65317'})],spacing:{after:0},keepNext:false})
  ]})
 ]})]}));
 children.push(p(`Classe : ${prep.classroom||'À préciser'}    ·    Date : ${displayDate(prep.date)}`,{spacing:{before:220,after:80}}));
 children.push(p(`Durée / organisation : ${prep.duration||'À préciser'}`,{spacing:{after:80}}));
 children.push(p(`Domaine : ${seq.domain}`,{spacing:{after:180}}));
 const sections=preparationSections(prep);
 if(seq.warning)sections.push({title:'Repère du guide',theme:'gold',blocks:[{kind:'paragraph',text:seq.warning}]});
 for(const section of sections){
  const palette=exportPalette[section.theme];const solid=section.theme==='orange';
  children.push(new Paragraph({
   heading:HeadingLevel.HEADING_1,children:[text(section.title,{bold:true,color:solid?'FFFFFF':palette.ink,size:25})],
   keepNext:true,spacing:{before:230,after:140,line:300},indent:{left:160,right:160},
   shading:{fill:solid?palette.ink:palette.pale,type:ShadingType.CLEAR},
   border:{left:{color:palette.ink,style:BorderStyle.SINGLE,size:15,space:8}}
  }));
  for(const block of section.blocks){
   const strong=block.kind==='heading'||block.kind==='objective';
   const opts:IParagraphOptions={
    children:[text(block.text,{bold:strong,color:solid?'FFFFFF':strong?palette.ink:'30343A',size:22})],
    spacing:{before:block.kind==='heading'?130:0,after:block.text?85:25,line:290},
    keepNext:block.kind==='heading',widowControl:true,
    ...(solid?{shading:{fill:palette.ink,type:ShadingType.CLEAR},indent:{left:180,right:180}}:{}),
    ...(block.kind==='heading'?{heading:HeadingLevel.HEADING_2}:{}),
    ...(block.kind==='bullet'?{numbering:{reference:'manual-bullets',level:0}}:{})
   };
   children.push(new Paragraph(opts));
  }
 }
 const cited=resourcePageNumbers(prep.materials);
 if(cited.length){
  children.push(new Paragraph({
   heading:HeadingLevel.HEADING_1,children:[text('Ressources',{bold:true,color:'FFFFFF',size:25})],
   keepNext:true,spacing:{before:230,after:140,line:300},indent:{left:160,right:160},
   shading:{fill:'2C7195',type:ShadingType.CLEAR},border:{left:{color:'2C7195',style:BorderStyle.SINGLE,size:15,space:8}}
  }));
  for(const pageNumber of cited){
   const image=await resourcePagePng(seq.level,pageNumber);
   if(!image)continue;
   const maxWidth=560,scale=Math.min(1,maxWidth/image.width);
   children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80,after:30},children:[new ImageRun({type:'png',data:image.data,transformation:{width:Math.round(image.width*scale),height:Math.round(image.height*scale)}})]}));
   children.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:160},children:[text(`Ressources, p. ${pageNumber}`,{size:16,color:'64605A'})]}));
  }
 }
 const document=new Document({
  creator:'Maths en poche',title:prep.title,description:`Fiche personnelle · ${sourceCaption(seq)}`,
  styles:{default:{document:{run:{font:FONT,size:22,color:'30343A'},paragraph:{spacing:{after:85,line:290}}}},paragraphStyles:[
   {id:'Title',name:'Title',basedOn:'Normal',run:{font:FONT,size:44,bold:true,color:'B65317'}},
   {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',run:{font:FONT,size:25,bold:true},paragraph:{keepNext:true}},
   {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',run:{font:FONT,size:22,bold:true},paragraph:{keepNext:true}}
  ]},
  numbering:{config:[{reference:'manual-bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:260,hanging:180}},run:{font:FONT}}}]}]},
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:760,bottom:900,left:760,right:760,header:300,footer:360}}},children}]
 });
 return new Uint8Array(await Packer.toArrayBuffer(document));
}
export async function exportPreparationDocx(prep:Preparation,seq:Sequence):Promise<void>{
 download(await createPreparationDocx(prep,seq),`fiche-${seq.level.toLowerCase()}-${exportFilename(prep.title)}.docx`,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
/** Word version of the overview tab: reconstructed text layout, plus cited resource pages as images. */
export async function createSourceDocx(seq:Sequence):Promise<Uint8Array>{
 const resources=await resourcesSectionChildren(seq.level,resourcePageNumbers(seq.materials));
 return packDocument([...sequenceOverviewChildren(seq),...resources],seq.title,`Vue d’ensemble · ${sourceCaption(seq)}`);
}
export async function exportSourceDocx(seq:Sequence):Promise<void>{
 download(await createSourceDocx(seq),`guide-${seq.id}.docx`,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
/** Same reconstructed layout for every sequence of a level, with every cited resource page appended once. */
export async function createGuideDocx(level:string,sequences:Sequence[]):Promise<Uint8Array>{
 const ordered=sequences.filter(s=>s.level===level).sort((a,b)=>a.period-b.period||a.week-b.week);
 const children=ordered.flatMap((seq,index)=>sequenceOverviewChildren(seq,index>0));
 const pages=[...new Set(ordered.flatMap(seq=>resourcePageNumbers(seq.materials)))].sort((a,b)=>a-b);
 children.push(...await resourcesSectionChildren(level,pages));
 return packDocument(children,`Outils pour les Maths ${level}`,`Vue d’ensemble complète · Outils pour les Maths ${level}, Magnard.`);
}
export async function exportGuideDocx(level:string,sequences:Sequence[]):Promise<void>{
 download(await createGuideDocx(level,sequences),`guide-complet-${level.toLowerCase()}.docx`,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
