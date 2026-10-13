import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/data/catalog.json'));
const pages=Object.fromEntries(['PS','MS'].map(l=>[l,JSON.parse(fs.readFileSync(`public/data/${l.toLowerCase()}.json`))]));

test('all manual overviews keep rituals, four days, four workshops and a separate maths corner',()=>{
 for(const s of catalog.sequences){
  const m=s.manual;assert.equal(m.rituals.length,3,s.id);
  assert.deepEqual(m.days.map(d=>d.number),[1,2,3,4],s.id);
  assert.equal(m.workshops.length,4,s.id);
  assert.ok(m.workshops.every(w=>w.title&&w.objective),s.id);
  assert.ok(m.mathCorner.title&&m.mathCorner.objective,s.id);
  assert.ok(!m.workshops.at(-1).objective.includes(m.mathCorner.title),s.id);
 }
});
test('daily lessons and workshop pages retain their own materials and explicit sections',()=>{
 for(const s of catalog.sequences){
  const collective=pages[s.level][s.start+1].manual;
  assert.equal(collective.sections.length,4,s.id);
  assert.ok(collective.sections.every((p,i)=>p.title.startsWith(`Jour ${i+1} `)),s.id);
  for(let offset=1;offset<=5;offset++){
   const p=pages[s.level][s.start+offset-1];
   assert.ok(p.manual.sections.every(section=>section.blocks.length),`${s.id} page ${p.number}`);
   assert.ok(p.manual.sections.flatMap(section=>section.materials).length>=p.materials.length,`${s.id} page ${p.number} materials`);
  }
 }
 const ms=pages.MS[36].manual.sections;
 assert.match(ms[2].materials.join(' '),/barquettes/);
 assert.doesNotMatch(ms[2].materials.join(' '),/Mémo/);
 assert.match(ms[3].materials.join(' '),/Mémo/);
 assert.match(pages.PS[37].manual.sections[0].materials.join(' '),/seau/i);
});
test('four-day enigma tables are separated into columns instead of merged lines',()=>{
 for(const level of ['PS','MS']){
  for(const s of catalog.sequences.filter(s=>s.level===level)){
   const ritual=pages[level][s.start].manual;
   const tables=ritual.sections.flatMap(s=>s.blocks).filter(b=>b.kind==='table');
   assert.ok(tables.length,`${s.id} enigma table`);
   for(const table of tables)assert.deepEqual(table.columns.map(c=>c.match(/Jour (\d)/)?.[1]),['1','2','3','4'],`${s.id} columns`);
  }
 }
});
