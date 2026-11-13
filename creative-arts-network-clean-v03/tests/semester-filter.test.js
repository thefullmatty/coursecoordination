import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const between=js.slice(js.indexOf('function sessionsFor('),js.indexOf('function renderGraph('));
const make=(semesters,details,edges)=>new Function('state', `${between};return {sessionsFor,visibleEdges,connections}`)({semesters:new Set(semesters),details,edges});
const sessions={CRA511:[{staff:'MvR',semester:'Semester 1',day:'Tuesday',program:'MA'}], IAS511:[{staff:'SP',semester:'Semester 1',day:'Friday'},{staff:'MvR',semester:'Semester 2',day:'Monday'}]};
const edge=(u,kind,val)=>({source:`Unit:${u}`,target:`${kind}:${val}`});
const edges=[edge('CRA511','Staff','MvR'),edge('CRA511','Semester','Semester 1'),edge('CRA511','Day','Tuesday'),edge('CRA511','Program','MA'),edge('IAS511','Staff','SP'),edge('IAS511','Staff','MvR'),edge('IAS511','Day','Friday'),edge('IAS511','Day','Monday'),edge('IAS511','Semester','Semester 1'),edge('IAS511','Semester','Semester 2')];
test('semester one filters staff and day relationships at session level',()=>{
 const g=make(['Semester 1'],sessions,edges);
 const staff=g.connections('Staff:MvR');
 assert.deepEqual(staff,['Unit:CRA511']);
 assert.deepEqual(g.connections('Day:Monday'),[]);
 assert.deepEqual(g.connections('Staff:SP'),['Unit:IAS511']);
});
test('semester two can reveal different teacher of same unit',()=>{
 const g=make(['Semester 2'],sessions,edges);
 assert.deepEqual(g.connections('Staff:MvR'),['Unit:IAS511']);
 assert.deepEqual(g.connections('Staff:SP'),[]);
 assert.deepEqual(g.connections('Program:MA'),[]);
});
test('selecting both restores all sessions; program edges persist if relevant',()=>{
 const g=make(['Semester 1','Semester 2'],sessions,edges);
 assert.deepEqual(g.connections('Staff:MvR'),['Unit:CRA511','Unit:IAS511']);
 assert.deepEqual(g.connections('Program:MA'),['Unit:CRA511']);
});
test('two independently selectable semesters plus second-degree control exist',()=>{
 assert.match(js,/\['semester1','Semester 1'\]/);
 assert.match(js,/\['semester2','Semester 2'\]/);
 assert.match(js,/\$\('showSecond'\)\.closest\('label'\)\.before\(semGroup\)/);
 assert.match(js,/renderGraph\(\);renderDetail\(\)/);
 assert.match(js,/event\.target\.checked=true/);
 assert.match(js,/\bload\(\);\s*$/);
});
