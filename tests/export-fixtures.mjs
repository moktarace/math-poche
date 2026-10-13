import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('tmp/qa/exports');await fs.mkdir(out,{recursive:true});
const runtime=process.env.DOCUMENT_RUNTIME_MODULES;
await build({stdin:{contents:"export {createPreparationPdf} from './src/app/pdf-export'; export {createPreparationDocx} from './src/app/docx-export'; export {sequenceFlow} from './src/app/export-model';",resolveDir:process.cwd()},outfile:path.join(out,'engine.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',...(runtime?{alias:{docx:path.join(runtime,'docx/dist/index.mjs')}}:{})});
const {createPreparationPdf,createPreparationDocx,sequenceFlow}=await import(pathToFileURL(path.join(out,'engine.mjs')));
const catalog=JSON.parse(await fs.readFile('public/data/catalog.json','utf8'));
const fonts={regular:new Uint8Array(await fs.readFile('public/fonts/LiberationSans-Regular.ttf')),bold:new Uint8Array(await fs.readFile('public/fonts/LiberationSans-Bold.ttf'))};
const base=(s)=>({id:'qa',sequenceId:s.id,title:s.title,classroom:s.level,date:'2026-10-13',duration:'4 jours · ateliers en rotation',objectives:s.objectives,materials:s.materials,flow:sequenceFlow(s),differentiation:s.differentiation,evaluation:'',notes:'',updatedAt:new Date().toISOString()});
const ps=catalog.sequences.find(s=>s.id==='ps-p1-s2'),ms=catalog.sequences.find(s=>s.id==='ms-p2-s6');
const normal=base(ps),other={...base(ms),flow:ms.flow,evaluation:'Observer le vocabulaire utilisé et la localisation des objets.',notes:'Conserver cette adaptation personnelle : groupe de 4 élèves. Écrire 1 + 1 = 2 ; 1 ≤ 2 ; 2 ≥ 1 ; départ → arrivée.'};
const stress={...base(ps),title:'Séquence avec un titre très long pour vérifier le retour à la ligne et la conservation de toutes les informations dans les exports PDF et Word modifiables',notes:Array.from({length:48},(_,i)=>`Observation ${String(i+1).padStart(2,'0')} : l’élève décrit sa démarche, compare les quantités et explique son choix.`).join('\n')+'\nFin des observations conservée.\nIdentifiant long : '+'a'.repeat(180)+'\nTexte spécial : <contenu> & « accents é è œ ».',evaluation:'Réussite observée après manipulation.'};
for(const [name,prep,seq] of [['ps',normal,ps],['ms',other,ms],['long',stress,ps]]){
 await fs.writeFile(path.join(out,name+'.json'),JSON.stringify({prep,seq}));
 await fs.writeFile(path.join(out,name+'.pdf'),await createPreparationPdf(prep,seq,fonts));
 await fs.writeFile(path.join(out,name+'.docx'),await createPreparationDocx(prep,seq));
 console.log('Generated',name);
}
