const agentDefs = [
  ['strategy','🧠',50,20], ['research','🔎',84,20], ['copy','✍️',50,20],
  ['creative','🎨',18,50], ['social','📱',82,50], ['seo','🔍',18,82],
  ['performance','💰',50,82], ['analytics','📊',82,82], ['crm','📧',63,82], ['growth','🧪',63,20]
];
const war = () => document.querySelector('.war');
const actors = new Map();

function actorMarkup(icon) {
  return `<div class="habbo-shadow"></div><div class="habbo-head"><i></i><span>•ᴗ•</span></div><div class="habbo-body"><b>${icon}</b></div><div class="habbo-legs"><i></i><i></i></div>`;
}
function point(xPct,yPct){const room=war();if(!room)return{x:100,y:100};const r=room.getBoundingClientRect();return{x:r.width*xPct/100,y:r.height*yPct/100};}
function stationPoint(id){const d=agentDefs.find(x=>x[0]===id);return d?point(d[2],d[3]):point(50,50)}
function bossPoint(){const c=document.querySelector('#core');if(c){const r=c.getBoundingClientRect(),w=war().getBoundingClientRect();return{x:r.left-w.left+r.width/2,y:r.top-w.top+r.height/2+22}}return point(50,48)}
function move(id,target,walking=true){const el=actors.get(id);if(!el)return;const current=el._point||target;el._point=target;el.classList.toggle('walking',walking);const dx=target.x-current.x,dy=target.y-current.y;el.style.setProperty('--x',`${target.x}px`);el.style.setProperty('--y',`${target.y}px`);el.style.setProperty('--duration',`${Math.max(700,Math.min(1800,Math.hypot(dx,dy)*2.6))}ms`);el.classList.remove('moving');void el.offsetWidth;el.classList.add('moving');setTimeout(()=>el.classList.remove('moving'),2000)}
function setup(){const room=war();if(!room||actors.size)return;const layer=document.createElement('div');layer.className='habbo-layer';room.appendChild(layer);agentDefs.forEach(([id,icon])=>{const el=document.createElement('div');el.className='habbo-agent';el.dataset.id=id;el.innerHTML=actorMarkup(icon)+`<span class="habbo-name">${id}</span>`;layer.appendChild(el);actors.set(id,el)});positionAll()}
function positionAll(){agentDefs.forEach(([id])=>{const el=actors.get(id);if(!el)return;const p=stationPoint(id);el._point=p;el.style.setProperty('--x',`${p.x}px`);el.style.setProperty('--y',`${p.y}px`)})}
function sync(){if(!actors.size)return;agentDefs.forEach(([id])=>{const card=document.querySelector(`#agent-${id}`),actor=actors.get(id);if(!card||!actor)return;if(card.classList.contains('active')){const p=stationPoint(id);if(Math.hypot((actor._point?.x||0)-p.x,(actor._point?.y||0)-p.y)>8)move(id,p,true);actor.classList.add('working');actor.classList.remove('delivering')}else if(card.classList.contains('done')){if(actor.dataset.delivered!=='1'){actor.dataset.delivered='1';move(id,bossPoint(),true)}actor.classList.remove('working');actor.classList.add('delivering')}else{actor.classList.remove('working','delivering');actor.dataset.delivered='0'}})}
function resetDelivered(){actors.forEach(a=>a.dataset.delivered='0');positionAll()}
function boot(){setup();setInterval(sync,350);window.addEventListener('resize',positionAll);document.querySelector('#reset')?.addEventListener('click',()=>setTimeout(resetDelivered,30))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();