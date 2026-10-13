import type { Preparation, Sequence } from './models';
export type ExportTheme = 'orange'|'blue'|'green'|'purple'|'pink'|'gold';
export const exportPalette = {
 orange:{ink:'B65317',pale:'FFF4DD'}, blue:{ink:'2C7195',pale:'EFF8FC'},
 green:{ink:'507E2A',pale:'F2F8E7'}, purple:{ink:'735897',pale:'F7F3FB'},
 pink:{ink:'AA377A',pale:'FCEFF6'}, gold:{ink:'8D5E00',pale:'FFF5DB'}
} as const;
export interface ExportBlock {kind:'paragraph'|'bullet'|'heading'|'objective';text:string;}
export interface ExportSection {title:string;theme:ExportTheme;blocks:ExportBlock[];}

/** Preserve personal text; only explicit labels determine its presentation. */
export function exportBlocks(text:string):ExportBlock[]{
 const blocks:ExportBlock[]=[];
 for(const raw of text.replace(/\r\n?/g,'\n').split('\n')){
  const line=raw.trim();
  if(!line){blocks.push({kind:'paragraph',text:''});continue;}
  const value=line.replace(/^(?:•|[-–])\s+/,'');
  const kind=/^(?:Jour\s+\d|Étape\s+\d|Dirigé|Semi-dirigé|Autonome(?:\s+\d)?|Mon cahier de maths)\b/.test(value)?'heading':/^Objectifs?\b/i.test(value)?'objective':value!==line?'bullet':'paragraph';
  blocks.push({kind,text:value});
 }
 while(blocks[0]?.text==='')blocks.shift();while(blocks.at(-1)?.text==='')blocks.pop();
 return blocks.length?blocks:[{kind:'paragraph',text:'À compléter.'}];
}
export function flowSections(flow:string):ExportSection[]{
 const sections:ExportSection[]=[];let section:ExportSection={title:'Déroulement',theme:'green',blocks:[]};let buffer:string[]=[];
 const flush=()=>{if(buffer.some(l=>l.trim())){section.blocks=exportBlocks(buffer.join('\n'));sections.push(section);}buffer=[];};
 const labels:{pattern:RegExp;title:string;theme:ExportTheme}[]=[
  {pattern:/^RITUELS$/i,title:'Rituels',theme:'blue'},
  {pattern:/^(?:ACTIVITÉS EN )?CLASSE ENTIÈRE$/i,title:'Activités en classe entière',theme:'green'},
  {pattern:/^(?:LES )?ATELIERS$/i,title:'Ateliers',theme:'purple'},
  {pattern:/^(?:LE )?COIN MATHS$/i,title:'Le coin maths',theme:'pink'}
 ];
 for(const line of flow.replace(/\r\n?/g,'\n').split('\n')){
  const label=labels.find(l=>l.pattern.test(line.trim()));
  if(label){flush();section={title:label.title,theme:label.theme,blocks:[]};}
  else buffer.push(line);
 }
 flush();return sections.length?sections:[{title:'Déroulement',theme:'green',blocks:exportBlocks('')}];
}
export function preparationSections(prep:Preparation):ExportSection[]{
 return [
  {title:'Objectifs d’apprentissage',theme:'orange',blocks:exportBlocks(prep.objectives)},
  {title:'Matériel',theme:'blue',blocks:exportBlocks(prep.materials)},
  ...flowSections(prep.flow),
  {title:'Différenciation',theme:'gold',blocks:exportBlocks(prep.differentiation)},
  {title:'Évaluation',theme:'purple',blocks:exportBlocks(prep.evaluation)},
  {title:'Notes personnelles',theme:'pink',blocks:exportBlocks(prep.notes)}
 ];
}
export function sequenceFlow(seq:Sequence):string{
 const m=seq.manual;if(!m)return seq.flow;
 return [
  'RITUELS',...m.rituals.map(r=>'• '+r),'','ACTIVITÉS EN CLASSE ENTIÈRE',
  ...m.days.map(d=>`Jour ${d.number} ${d.title}`),'','ATELIERS',
  ...m.workshops.map(w=>`${w.label} ${w.title}\nObjectif : ${w.objective}${w.note?'\n'+w.note:''}\n`),
  'LE COIN MATHS',m.mathCorner.title,'Objectif : '+m.mathCorner.objective
 ].join('\n');
}
export const exportFilename=(title:string)=>title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase().slice(0,90)||'sequence';
export function displayDate(date:string):string{return /^(\d{4})-(\d{2})-(\d{2})$/.test(date)?date.split('-').reverse().join('/'):date||'À préciser';}
export function sourceCaption(seq:Sequence):string{return `Outils pour les Maths ${seq.level}, Magnard, pages ${seq.start} à ${seq.end}.`;} 
