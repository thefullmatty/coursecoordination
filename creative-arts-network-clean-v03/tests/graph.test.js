import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheets } from '../src/graph.js';
const t=[['Unit Code','Unit Title','','','','Program','Semester','Staff','','Day','Start','End'],['CRA128','Printmaking','','','Specialist Elective','Bachelor of Creative Arts (WCART2)','Semester 2','MvR','','Friday','09:00','12:00'],['CRA305','Studio Practice 5','','','Major: All','Bachelor of Creative Arts (WCART2)','Semester 1','SP','','Wednesday','09:00','12:00']];
const d=[[],['Unit Code','Unit Title','Unit Type','Semester','Staff','Day','Start Time','End Time','Unit Code','Unit Title','Semester','Staff','Day','Start Time','End Time'],['CUAPRI411','Printmaking','TAFE unit','Semester 2','MvR','Tuesday','09:00','16:00'],['CRA105','Studio Practice 1','Core','Semester 1','AM','Wednesday','09:00','12:00','CUADES301\nCUADES302','Colour\n2D design','Semester 1','AM','Wednesday','09:00','16:00']];
test('both HE and TAFE units are independent but connect to the same staff',()=>{const g=parseSheets(t,d);assert(g.nodes.some(n=>n.id==='Unit:CRA128'));assert(g.nodes.some(n=>n.id==='Unit:CUAPRI411'));assert(g.edges.some(e=>e.source==='Unit:CRA128'&&e.target==='Staff:MvR'));assert(g.edges.some(e=>e.source==='Unit:CUAPRI411'&&e.target==='Staff:MvR'));});
test('right-hand dual delivery TAFE codes become separate nodes',()=>{const g=parseSheets(t,d);assert(g.nodes.some(n=>n.id==='Unit:CUADES301'));assert(g.nodes.some(n=>n.id==='Unit:CUADES302'));});
test('shared final-year majors connect across the four established major pathways',()=>{const g=parseSheets(t,d);assert.equal(g.edges.filter(e=>e.source==='Unit:CRA305'&&e.relation==='in major').length,4);});

test('master and Honours teaching are present in staff network, independently of BA',()=>{
  const rows=[t[0],
    ['CRA211','Artists, Artworks and Art Movements','','','Core','Bachelor of Creative Arts (WCART2)','Semester 1','MvR','','Tuesday','13:00','16:00'],
    ['CRA511','Artists, Artworks and Art Movements','','','Core','Master of Arts – Coursework (SARTS2)','Semester 1','MvR','','Tuesday','13:00','16:00'],
    ['IAS511','Creative Project','','','Specialist Elective','Master of Arts – Coursework (SARTS2)','Semester 2','MvR','','Friday','09:00','12:00'],
    ['IAS424','Research Methods for the Creative Arts','','','Specialist Elective','Honours','Semester 1','MvR','','Thursday','09:00','12:00'],
    ['CUAPRI411','Printmaking','','','','Certificate IV in Visual Arts (CUA41320)','Semester 2','MvR','','Tuesday','09:00','16:00']
  ];
  const g=parseSheets(rows,[]);
  for(const code of ['CRA211','CRA511','IAS511','IAS424','CUAPRI411']){
    assert(g.nodes.some(n=>n.id===`Unit:${code}`));
    assert(g.edges.some(e=>e.source===`Unit:${code}`&&e.target==='Staff:MvR'));
  }
  assert(g.nodes.some(n=>n.id==='Program:Master of Arts – Coursework (SARTS2)'));
  assert(g.details.CRA511.some(s=>s.program.includes('Master of Arts')));
  assert(!g.edges.some(e=>e.source==='Unit:CRA511'&&e.target==='Major:Visual Arts'));
});

test('multiple coded TAFE cluster in master timetable is represented separately',()=>{
 const g=parseSheets([t[0],['CUADES301\nCUADES302','Colour\n2D forms','','','','Certificate IV in Visual Arts (CUA41320)','Semester 1','AM','','Wednesday','09:00','16:00']],[]);
 assert(g.nodes.some(n=>n.id==='Unit:CUADES301'));
 assert(g.nodes.some(n=>n.id==='Unit:CUADES302'));
});
