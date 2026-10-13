import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('public/data/catalog.json','utf8'));
test('24 complete sequences, 12 for each level, from the actual supplied pages',()=>{
 assert.equal(catalog.sequences.length,24);assert.equal(new Set(catalog.sequences.map(s=>s.id)).size,24);
 for(const level of ['PS','MS']){const sequences=catalog.sequences.filter(s=>s.level===level);assert.equal(sequences.length,12);for(const s of sequences){assert.ok(s.title&&s.objectives&&s.flow&&s.materials);assert.equal(s.end-s.start,5);assert.ok(s.end<=108);assert.ok([1,2].includes(s.period));}}
});
test('every guide page has searchable text and a matching original image',()=>{
 for(const level of ['ps','ms']){const pages=JSON.parse(fs.readFileSync(`public/data/${level}.json`,'utf8'));assert.equal(pages.length,108);pages.forEach((p,i)=>{assert.equal(p.number,i+1);assert.ok(typeof p.text==='string');assert.ok(fs.statSync(`public/${p.image}`).size>1000);});}
});
test('MS page 108 source inconsistency is explicitly retained and flagged',()=>{assert.match(catalog.sequences.find(s=>s.id==='ms-p2-s6').warning,/108/);});
test('PWA caches the entire text library; original PDFs and images are optional',()=>{const sw=JSON.parse(fs.readFileSync('ngsw-config.json'));assert.ok(sw.assetGroups.find(g=>g.installMode==='prefetch').resources.files.includes('/data/**'));assert.ok(sw.assetGroups.find(g=>g.name==='documents').installMode==='lazy');});
