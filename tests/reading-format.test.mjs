import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatReading, weeklyPlan } from '../src/app/reading-format.ts';

test('PDF line wrapping becomes paragraphs without swallowing section headings',()=>{
 const blocks=formatReading('Déroulement\nCette semaine, les élèves\nobservent les solides.\nÉtape 1 Manipuler\n• Sortir les formes\net les nommer.\n• Comparer.\nDifférenciation\n• Accompagner.');
 assert.equal(blocks[0].text,'Déroulement');
 assert.equal(blocks[1].text,'Cette semaine, les élèves observent les solides.');
 assert.equal(blocks[2].kind,'step');
 assert.deepEqual(blocks[3].items,['Sortir les formes et les nommer.','Comparer.']);
 assert.equal(blocks[4].text,'Différenciation');
});
test('an objective retains all wrapped text in its callout',()=>{
 const b=formatReading('Objectif Comparer les masses\nde deux objets.\nPréparation\n• Installer la balance.');
 assert.equal(b[0].kind,'objective');assert.equal(b[0].text,'Comparer les masses de deux objets.');
});
test('all 24 sequences expose exactly their four days and their workshops',()=>{
 const catalog=JSON.parse(fs.readFileSync('public/data/catalog.json'));
 for(const s of catalog.sequences){const plan=weeklyPlan(s.flow);assert.deepEqual(plan.days.map(d=>d.number),['1','2','3','4'],s.id);assert.ok(plan.workshops.length>80,s.id);}
});
test('rotated running headers are hidden without dropping the actual lesson text',()=>{
 const page=JSON.parse(fs.readFileSync('public/data/ps.json'))[36];
 const blocks=formatReading(page.text);const content=JSON.stringify(blocks);
 assert.ok(content.includes('Le trésor de Kira'));assert.ok(content.includes('fourchette'));
 assert.ok(!content.includes('P é ri o d e'));
});
