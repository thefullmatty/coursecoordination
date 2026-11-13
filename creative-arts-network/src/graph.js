// Pure transformer: testable independently of Google credentials or Cloudflare.
export const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
export const MAJORS = [
  { name:'Visual Arts', codes:['CRA126','CRA127','CRA229','CRA230'] },
  { name:'Screen Media Arts', codes:['CRA121','CRA122','CRA222','CRA223'] },
  { name:'Music', codes:['CRA112','CRA116','CRA212','CRA213'] },
  { name:'Storytelling & Writing', codes:['CRA124','CRA125','CRA224','CRA225'] }
];
const fixedMajor = new Set(['CRA305','CRA306','CRA300']);
const clean = value => String(value ?? '').trim();
const entry = (code,title,semester,staff,day,start,end,type,source) => ({
  code:clean(code), title:clean(title), semester:clean(semester), staff:clean(staff),
  day:clean(day), start:clean(start), end:clean(end), type:clean(type), source
});
export function parseSheets(timetable,dual) {
  const units = [];
  for (const row of (timetable || []).slice(1)) {
    if (clean(row[0]).startsWith('CRA') && clean(row[5]).includes('Bachelor of Creative Arts')) {
      units.push(entry(row[0],row[1],row[6],row[7],row[9],row[10],row[11],row[4],'2027'));
    }
  }
  for (const row of (dual || []).slice(2)) {
    if (!clean(row[0]) || clean(row[0])==='Unit Code') continue;
    const primaryCodes = clean(row[0]).split(/\n/).filter(Boolean);
    const primaryTitles = clean(row[1]).split(/\n/);
    const primaryType = clean(row[2]);
    if (primaryCodes.some(c => c.startsWith('CUA') || c.startsWith('BSB'))) {
      primaryCodes.forEach((code,i) => units.push(entry(code,primaryTitles[i]||primaryTitles[0],row[3],row[4],row[5],row[6],row[7],'TAFE unit','Vis Arts Dual Delivery')));
    } else if (primaryCodes.some(c=>c.startsWith('CRA'))) {
      // Prefer the master timetable for BA; retain only exceptions not represented there.
      primaryCodes.forEach((code,i)=>{
        const e=entry(code,primaryTitles[i]||primaryTitles[0],row[3],row[4],row[5],row[6],row[7],primaryType,'Vis Arts Dual Delivery');
        if(!units.some(u => u.code===e.code && u.semester===e.semester && u.day===e.day && u.start===e.start))units.push(e);
      });
    }
    // Independent TAFE codes on the right side of the dual-delivery worksheet.
    const sideCodes=clean(row[8]).split(/\n/).filter(c=>/^(CUA|BSB)/.test(c));
    const sideTitles=clean(row[9]).split(/\n/);
    sideCodes.forEach((code,i)=>units.push(entry(code,sideTitles[i]||sideTitles[0],row[10],row[11],row[12],row[13],row[14],'TAFE unit','Vis Arts Dual Delivery')));
  }
  const nodeMap = new Map(), edgeMap = new Map();
  const addNode=(kind,value,label=value)=>{
    if(!value)return null;
    const id=`${kind}:${value}`;
    if(!nodeMap.has(id))nodeMap.set(id,{id,kind,label});
    return id;
  };
  const connect=(a,b,relation)=>{
    if(!a||!b)return;
    const key=[a,b].sort().join('|');
    if(!edgeMap.has(key))edgeMap.set(key,{id:key,source:a,target:b,relation});
  };
  const unitSessions = new Map();
  for(const u of units){
    const code=u.code; if(!code)continue;
    const main=addNode('Unit',code,`${code} · ${u.title}`);
    if(!unitSessions.has(code))unitSessions.set(code,[]);
    const signature=[u.semester,u.day,u.start,u.end,u.staff].join('|');
    if(!unitSessions.get(code).some(s=>[s.semester,s.day,s.start,s.end,s.staff].join('|')===signature))unitSessions.get(code).push(u);
    const kind = /^(CUA|BSB)/.test(code)?'TAFE unit':(u.type?.toLowerCase().includes('core')?'Core':u.type?.toLowerCase().includes('major')||fixedMajor.has(code)||MAJORS.some(m=>m.codes.includes(code))?'Major':u.type?.toLowerCase().includes('specialist')?'Specialist elective':u.type || 'Other');
    connect(main,addNode('Unit Type',kind),'classified as');
    connect(main,addNode('Staff',u.staff),'taught by');
    connect(main,addNode('Semester',u.semester),'offered in');
    connect(main,addNode('Day',u.day),'scheduled on');
    for(const m of MAJORS)if(m.codes.includes(code)||fixedMajor.has(code))connect(main,addNode('Major',m.name),'in major');
  }
  return {
    updatedAt:new Date().toISOString(),
    nodes:[...nodeMap.values()], edges:[...edgeMap.values()],
    details:Object.fromEntries([...unitSessions.entries()]),
    notes:'Staff and semester/day connections derive from individual timetable rows. Connections do not imply that two units are formally co-taught.'
  };
}
