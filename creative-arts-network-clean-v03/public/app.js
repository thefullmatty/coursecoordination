const $=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
let state={nodes:[],edges:[],details:{},focus:null,journey:[],second:false,semesters:new Set(["Semester 1","Semester 2"])};
const kindColors={'Unit':'#366f8a','Staff':'#a47b43','Major':'#846c97','Semester':'#477d77','Day':'#477d77','Unit Type':'#8e8d7c','Program':'#5b7485'};
const nodeName=n=>n.kind==='Unit'?n.label.split(' · ')[0]:n.label;
const nodeDescription=n=>n.kind==='Unit'?n.label.split(' · ').slice(1).join(' · '):n.kind;
function el(name,attrs={},text=''){const e=document.createElementNS(svgNS,name);for(const [key,v]of Object.entries(attrs))e.setAttribute(key,String(v));if(text)e.textContent=text;return e;}
function focusNode(id,remember=true){if(!state.nodes.some(n=>n.id===id))return;if(remember&&state.focus!==id)state.journey.push(id);state.focus=id;renderGraph();renderDetail();$('back').disabled=state.journey.length<2;}
function selectCategory(kind){$('category').value=kind;$('search').value='';listChoices();}
function listChoices(){const q=$('search').value.trim().toLowerCase(),kind=$('category').value;const arr=state.nodes.filter(n=>n.kind===kind&&(n.label.toLowerCase().includes(q)||n.id.toLowerCase().includes(q))).sort((a,b)=>a.label.localeCompare(b.label));const box=$('choice');box.replaceChildren();for(const n of arr){const option=document.createElement('option');option.value=n.id;option.textContent=n.label;box.appendChild(option);}box.size=Math.min(10,Math.max(3,arr.length));}
// Semester is a view filter, not a different search. Both checked means the full year.
// Each staff/day/semester edge must be supported by a session in the active periods.
function sessionsFor(code){
  const all=state.details[code]||[];
  if(state.semesters.size===2)return all;
  return all.filter(s=>state.semesters.has(s.semester));
}
function visibleEdges(){
  return state.edges.filter(e=>{
    const unitId=[e.source,e.target].find(id=>id.startsWith('Unit:'));
    if(!unitId)return true;
    const sessions=sessionsFor(unitId.slice(5));
    if(!sessions.length)return false;
    const other=e.source===unitId?e.target:e.source;
    if(other.startsWith('Staff:'))return sessions.some(s=>s.staff===other.slice(6));
    if(other.startsWith('Day:'))return sessions.some(s=>s.day===other.slice(4));
    if(other.startsWith('Semester:'))return sessions.some(s=>s.semester===other.slice(9));
    // Program, Major and Unit Type are meaningful when the unit is active.
    return true;
  });
}
function connections(id,edges=visibleEdges()){
  return edges.filter(e=>e.source===id||e.target===id).map(e=>e.source===id?e.target:e.source);
}


function renderGraph(){
  const svg=$('graph');
  svg.replaceChildren();
  const center=state.nodes.find(n=>n.id===state.focus);
  if(!center)return;
  const edges=visibleEdges();
  const direct=[...new Set(connections(center.id,edges))]
    .map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);
  let second=[];
  if(state.second){
    const seen=new Set([center.id,...direct.map(n=>n.id)]);
    for(const n of direct){
      for(const id of connections(n.id,edges)){
        if(seen.has(id))continue;
        seen.add(id);
        const match=state.nodes.find(x=>x.id===id);
        if(match)second.push(match);
      }
    }
    second=second.slice(0,24);
  }
  // An expanding canvas keeps nodes readable when a central concept has many links.
  const many=direct.length>13;
  const w=many?1400:1100, h=many?1050:820;
  const cx=w/2,cy=h/2;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const pos=new Map([[center.id,{x:cx,y:cy}]]);
  function ring(nodes,rx,ry,phase=-Math.PI/2){
    nodes.forEach((n,i)=>{
      const a=phase+2*Math.PI*i/Math.max(1,nodes.length);
      pos.set(n.id,{x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a)});
    });
  }
  ring(direct,many?490:365,many?365:280);
  ring(second,many?650:505,many?475:365);
  const secondIds=new Set(second.map(n=>n.id));
  // Explicit lines rather than invisible CSS defaults: clear primary relationships.
  for(const e of edges){
    const a=pos.get(e.source),b=pos.get(e.target);
    if(!a||!b)continue;
    const distant=secondIds.has(e.source)||secondIds.has(e.target);
    svg.appendChild(el('line',{
      x1:a.x,y1:a.y,x2:b.x,y2:b.y,
      stroke:distant?'#b2c2c8':'#617c87',
      'stroke-width':distant?1.4:2.5,
      'stroke-dasharray':distant?'5 6':'none',
      opacity:distant?.4:.86,'pointer-events':'none'
    }));
  }
  const palette={
    Unit:['#e6f0f4','#427b95'],Staff:['#f7eedf','#ab844c'],
    Major:['#efe9f4','#846c97'],Semester:['#e3f0ec','#528c80'],
    Day:['#e3f0ec','#528c80'],'Unit Type':['#efeee8','#8e8b79'],Program:['#e8ecf8','#6178a1']
  };
  // Each node is a self-contained, clickable rectangular label (no circle).
  for(const n of [...second,...direct,center]){
    const p=pos.get(n.id);
    const central=n.id===center.id;
    const distant=secondIds.has(n.id);
    const [fill,stroke]=palette[n.kind]||['#eff3f3','#71848b'];
    const full=nodeName(n);
    const lines=wrapLabel(full,central?25:distant?16:21,central?3:2);
    const fontSize=central?17:distant?11:13;
    const width=Math.min(central?280:distant?166:220,
      Math.max(90,Math.max(...lines.map(l=>l.length))*fontSize*.60+28));
    const height=18+lines.length*(fontSize+5);
    const x=p.x-width/2,y=p.y-height/2;
    const group=el('g',{
      class:'graphnode'+(central?' central':'')+(distant?' distant':''),
      tabindex:'0',role:'button','aria-label':n.label+' — select node'
    });
    group.appendChild(el('rect',{
      x,y,width,height,rx:9,fill,stroke,
      'stroke-width':central?2.7:1.6
    }));
    lines.forEach((line,i)=>group.appendChild(el('text',{
      x:p.x,y:y+15+fontSize+(fontSize+5)*i-2,
      'text-anchor':'middle','font-size':fontSize,
      'font-weight':central?750:650,fill:'#20313b',
      'pointer-events':'none'
    },line)));
    group.appendChild(el('title',{},n.label));
    group.addEventListener('click',()=>focusNode(n.id));
    group.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();focusNode(n.id);}
    });
    svg.appendChild(group);
  }
  $('graphTitle').textContent=center.label;
  const period=state.semesters.size===2?'Both semesters':[...state.semesters][0];
  $('count').textContent=`${direct.length} direct connections · ${period}`;
  $('graphnote').textContent=state.second
    ? 'Solid lines: direct relationships. Dashed lines: second-degree relationships.'
    : 'Click a label to place it at the centre of the network.';
}
function wrapLabel(label,maxCharacters,maxLines){
  const words=label.split(/\s+/).filter(Boolean);
  const result=[];let current='';
  for(const word of words){
    if(!current){current=word;continue;}
    if((current+' '+word).length<=maxCharacters)current+=' '+word;
    else{result.push(current);current=word;}
  }
  if(current)result.push(current);
  if(!result.length)return [label];
  if(result.length>maxLines){
    const first=result.slice(0,maxLines-1);
    const last=result.slice(maxLines-1).join(' ');
    first.push(last.length>maxCharacters?last.slice(0,maxCharacters-1)+'…':last);
    return first;
  }
  return result.map(line=>line.length>maxCharacters?line.slice(0,maxCharacters-1)+'…':line);
}
function textRow(a,b){const row=document.createElement('div');row.className='detailrow';const l=document.createElement('span'),r=document.createElement('span');l.textContent=a;r.textContent=b;row.append(l,r);return row;}
function renderDetail(){
  const n=state.nodes.find(n=>n.id===state.focus);
  if(!n)return;
  $('detailTitle').textContent=n.kind==='Unit'?nodeDescription(n):n.label;
  $('detailKind').textContent=n.kind==='Unit'?`${nodeName(n)} · Unit`:n.kind;
  const body=$('detailBody');body.replaceChildren();
  const sessions=sessionsFor(nodeName(n));
  if(n.kind==='Unit'&&sessions.length){
    for(const s of sessions){
      const block=document.createElement('div');block.className='detailsection';
      const strong=document.createElement('strong');strong.textContent=s.semester||'Unscheduled';block.appendChild(strong);
      for(const [label,value] of [['Program',s.program],['Day',s.day],['Time',s.start&&s.end?`${s.start}–${s.end}`:''],['Staff',s.staff],['Unit type',s.type],['Source',s.source]])
        if(value)block.appendChild(textRow(label,value));
      body.appendChild(block);
    }
  }else{
    const nearby=connections(n.id);
    const unitIds=[...new Set(nearby)].filter(id=>id.startsWith('Unit:')).sort();
    body.appendChild(textRow('Direct connections',String(nearby.length)));
    if(unitIds.length){
      const heading=document.createElement('h3');heading.textContent=`Connected units (${unitIds.length})`;body.appendChild(heading);
      for(const id of unitIds){
        const unit=state.nodes.find(x=>x.id===id);
        if(!unit)continue;
        const button=document.createElement('button');button.type='button';button.textContent=unit.label;
        button.style.cssText='display:block;width:100%;text-align:left;margin:6px 0;padding:9px 10px;white-space:normal;overflow-wrap:anywhere';
        button.addEventListener('click',()=>focusNode(id));body.appendChild(button);
      }
    }else{
      const desc=document.createElement('p');desc.textContent='Select a connected node to follow this relationship.';body.appendChild(desc);
    }
  }
  if(n.kind==='Unit'&&!sessions.length){
    const p=document.createElement('p');p.textContent='No teaching sessions in the selected semester(s).';body.appendChild(p);
  }
  const h=$('history');h.replaceChildren();
  for(const id of state.journey.slice(-7)){
    const node=state.nodes.find(n=>n.id===id);if(!node)continue;
    const b=document.createElement('button');b.textContent=nodeName(node);b.addEventListener('click',()=>focusNode(id));h.appendChild(b);
  }
}
async function load(){const old=state.focus;$('status').textContent='Refreshing live Google Sheet…';$('status').classList.remove('error');try{const response=await fetch('/api/graph',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);state.nodes=data.nodes;state.edges=data.edges;state.details=data.details;state.journey=[];listChoices();const first=state.nodes.find(n=>n.id===old)||state.nodes.find(n=>n.id==='Unit:CRA128')||state.nodes[0];if(first)focusNode(first.id);$('status').textContent=`Live · ${state.nodes.filter(n=>n.kind==='Unit').length} units · refreshed ${new Date(data.updatedAt).toLocaleTimeString()}`;}catch(error){$('status').textContent='Connection unavailable';$('status').classList.add('error');$('graphnote').textContent=error.message;$('graph').replaceChildren(el('text',{x:400,y:290,'text-anchor':'middle'},'Google Sheets connection not yet configured'));}}
if(!$('category').querySelector('option[value="Program"]')){const option=document.createElement('option');option.value='Program';option.textContent='Program';$('category').appendChild(option);}
$('category').addEventListener('change',listChoices);$('search').addEventListener('input',listChoices);$('choice').addEventListener('change',e=>focusNode(e.target.value));$('back').addEventListener('click',()=>{if(state.journey.length>1){state.journey.pop();focusNode(state.journey[state.journey.length-1],false)}});$('reset').addEventListener('click',()=>{state.journey=[];focusNode('Unit:CRA128')});$('showSecond').addEventListener('change',e=>{state.second=e.target.checked;renderGraph();});
// Build this control in JavaScript to preserve customised HTML and CSS.
const semGroup=document.createElement('fieldset');
semGroup.setAttribute('aria-label','Semester visibility');
semGroup.style.cssText='border:1px solid #d9e1e4;border-radius:8px;padding:10px 12px;margin:10px 0 16px;min-width:0';
const semLegend=document.createElement('legend');
semLegend.textContent='Semester';
semLegend.style.cssText='font-size:12px;font-weight:700;padding:0 5px';
semGroup.appendChild(semLegend);
for(const [id,label] of [['semester1','Semester 1'],['semester2','Semester 2']]){
  const wrapper=document.createElement('label');
  wrapper.style.cssText='display:flex;align-items:center;gap:8px;font-size:12px;font-weight:400;margin:5px 0;cursor:pointer';
  const box=document.createElement('input');
  box.type='checkbox';box.id=id;box.value=label;box.checked=true;
  box.style.accentColor='#366f8a';
  wrapper.append(box,document.createTextNode(label));
  semGroup.appendChild(wrapper);
}
$('showSecond').closest('label').before(semGroup);
function updateSemesters(event){
  const boxes=[$('semester1'),$('semester2')];
  const chosen=boxes.filter(b=>b.checked).map(b=>b.value);
  if(!chosen.length){ // Keep at least one semester active.
    event.target.checked=true;
    return;
  }
  state.semesters=new Set(chosen);
  renderGraph();renderDetail();
}
$('semester1').addEventListener('change',updateSemesters);
$('semester2').addEventListener('change',updateSemesters);$('refresh').addEventListener('click',load);load();
