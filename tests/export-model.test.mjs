import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preparationSections,sequenceFlow,flowSections,displayDate} from '../src/app/export-model.ts';
const seqs=JSON.parse(fs.readFileSync('public/data/catalog.json')).sequences;
test('new fiches contain every source ritual, day, workshop and maths corner',()=>{
 for(const s of seqs){const flow=sequenceFlow(s);for(const t of [...s.manual.rituals,...s.manual.days.map(d=>d.title),...s.manual.workshops.map(w=>w.title),s.manual.mathCorner.title])assert.ok(flow.includes(t));assert.deepEqual(flowSections(flow).map(s=>s.theme),['blue','green','purple','pink']);}
});
test('both exports preserve personal fields and never replace an edited flow with source text',()=>{
 const p={objectives:'Objectifs adaptés é → ≤',materials:'• A\n• B',flow:'Ma séance personnalisée\nÉtape 1 Observer\nTexte < & >\n\nATELIERS\nMon atelier adapté',differentiation:'Aide personnelle',evaluation:'Réussite observée',notes:'Note finale unique'};
 const before=JSON.stringify(p),sections=preparationSections(p),text=JSON.stringify(sections);
 for(const x of ['Objectifs adaptés é → ≤','Ma séance personnalisée','Texte < & >','Mon atelier adapté','Aide personnelle','Réussite observée','Note finale unique'])assert.ok(text.includes(x));
 assert.equal(JSON.stringify(p),before);assert.equal(sections.at(-1).title,'Notes personnelles');
});
test('empty personal sections remain visible for completion and dates use French order',()=>{
 assert.ok(preparationSections({objectives:'',materials:'',flow:'',differentiation:'',evaluation:'',notes:''}).every(s=>s.blocks[0].text==='À compléter.'));
 assert.equal(displayDate('2026-10-13'),'13/10/2026');
});
