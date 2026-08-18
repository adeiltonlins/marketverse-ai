const agentDefs = [
  ['strategy','🧠'],['research','🔎'],['copy','✍️'],['creative','🎨'],['social','📱'],
  ['seo','🔍'],['performance','💰'],['analytics','📊'],['crm','📧'],['growth','🧪']
];

const war = () => document.querySelector('.war');
const actors = new Map();

function actorMarkup(icon) {
  return `<div class="habbo-shadow"></div><div class="habbo-head"><i></i><span>•ᴗ•</span></div><div class="habbo-body"><b>${icon}</b></div><div class="habbo-legs"><i></i><i></i></div>`;
}

function setup() {
  const room = war();
  if (!room || actors.size) return;
  const layer = document.createElement('div');
  layer.className = 'habbo-layer';
  room.appendChild(layer);
  agentDefs.forEach(([id, icon]) => {
    const el = document.createElement('div');
    el.className = 'habbo-agent';
    el.dataset.id = id;
    el.innerHTML = actorMarkup(icon) + `<span class="habbo-name">${id}</span>`;
    layer.appendChild(el);
    actors.set(id, el);
  });
  positionAll();
}

function roomPoint(el) {
  const room = war();
  const r = room.getBoundingClientRect();
  const x = Math.max(30, Math.min(r.width - 60, el.left - r.left + el.width / 2));
  const y = Math.max(80, Math.min(r.height - 45, el.top - r.top + el.height - 28));
  return {x, y};
}

function stationPoint(id) {
  const card = document.querySelector(`#agent-${id}`);
  if (!card) return {x:100,y:120};
  return roomPoint(card.getBoundingClientRect());
}

function bossPoint() {
  const core = document.querySelector('#core');
  return core ? roomPoint(core.getBoundingClientRect()) : {x:500,y:380};
}

function move(id, target, walking = true) {
  const el = actors.get(id);
  if (!el) return;
  const current = el._point || stationPoint(id);
  el._point = target;
  el.classList.toggle('walking', walking);
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  el.style.setProperty('--x', `${target.x}px`);
  el.style.setProperty('--y', `${target.y}px`);
  el.style.setProperty('--dx', `${dx}px`);
  el.style.setProperty('--dy', `${dy}px`);
  el.style.setProperty('--duration', `${Math.max(650, Math.min(2200, Math.hypot(dx,dy)*3.2))}ms`);
  el.classList.remove('moving');
  void el.offsetWidth;
  el.classList.add('moving');
  setTimeout(() => el.classList.remove('moving'), 2300);
}

function positionAll() {
  agentDefs.forEach(([id]) => {
    const p = stationPoint(id);
    const el = actors.get(id);
    if (!el) return;
    el._point = p;
    el.style.setProperty('--x', `${p.x}px`);
    el.style.setProperty('--y', `${p.y}px`);
  });
}

function sync() {
  if (!actors.size) return;
  agentDefs.forEach(([id]) => {
    const card = document.querySelector(`#agent-${id}`);
    const actor = actors.get(id);
    if (!card || !actor) return;
    if (card.classList.contains('active')) {
      const p = stationPoint(id);
      if (Math.hypot((actor._point?.x||0)-p.x, (actor._point?.y||0)-p.y) > 8) move(id,p,true);
      actor.classList.add('working');
      actor.classList.remove('delivering');
    } else if (card.classList.contains('done')) {
      const p = bossPoint();
      if (actor.dataset.delivered !== '1') {
        actor.dataset.delivered = '1';
        move(id,p,true);
      }
      actor.classList.remove('working');
      actor.classList.add('delivering');
    } else {
      actor.classList.remove('working','delivering');
      actor.dataset.delivered = '0';
    }
  });
}

function resetDelivered() {
  actors.forEach(a => { a.dataset.delivered = '0'; });
  positionAll();
}

function boot() {
  setup();
  setInterval(sync, 350);
  window.addEventListener('resize', positionAll);
  document.querySelector('#reset')?.addEventListener('click', () => setTimeout(resetDelivered, 30));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
