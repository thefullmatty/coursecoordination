import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheets } from '../src/graph.js';
import { readFileSync } from 'node:fs';

const header=['Unit Code','Unit Title','Credit Points','Level','Unit Type','Program','Semester','Staff','Room','Day','Start Time','End Time'];
const row=(code,title,program,semester,staff,day,start,end)=>[code,title,'10','500','Specialist Elective',program,semester,staff,'',day,start,end];
const ma='Master of Arts – Coursework (SARTS2)';
const vet='Certificate IV in Visual Arts (CUA41320)';
const fixture=[header,
  row('CRA511','Artists, Artworks and Art Movements',ma,'Semester 1','MvR','Tuesday','13:00','16:00'),
  row('CRA503','Research Methods for the Creative Arts',ma,'Semester 1','MvR','Thursday','09:00','12:00'),
  row('IAS511','Creative Project',ma,'Semester 1','SP','Friday','09:00','12:00'),
  row('IAS511','Creative Project',ma,'Semester 2','MvR','Friday','09:00','12:00'),
  row('CUAPRI411','Printmaking',vet,'Semester 2','MvR','Tuesday','09:00','16:00')
];
test('500-level units and TAFE coexist in the MvR staff neighbourhood',()=>{
 const g=parseSheets(fixture,[]);
 const neighbors=g.edges.filter(e=>e.source==='Staff:MvR'||e.target==='Staff:MvR').map(e=>e.source==='Staff:MvR'?e.target:e.source);
 for(const code of ['CRA511','CRA503','IAS511','CUAPRI411'])assert(neighbors.includes(`Unit:${code}`),code);
 assert(g.nodes.find(n=>n.id==='Unit:CRA511')?.label.includes('Artists'));
 assert(g.details.IAS511.some(s=>s.staff==='SP'));
 assert(g.details.IAS511.some(s=>s.staff==='MvR'));
});
test('the interface exposes programs and clickable unit listings',()=>{
 const s=readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
 assert.match(s,/Connected units/);
 assert.match(s,/option\.value='Program'/);
 assert.match(s,/function renderDetail\(/);
 assert.match(s,/\bload\(\);\s*$/);
});
