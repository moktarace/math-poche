import { AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, Packer, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import type { IRunOptions, IParagraphOptions } from 'docx';
import type { Preparation, Sequence } from './models';
import { preparationSections, exportPalette, exportFilename, displayDate, sourceCaption } from './export-model';
import { download } from './file-download';
const FONT='Liberation Sans';
const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const noBorders={top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder};
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
