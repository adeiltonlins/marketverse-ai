const agents=[
 {id:'strategy',name:'Estratégia',icon:'🧠',cls:'a1'},
 {id:'research',name:'Pesquisa',icon:'🔎',cls:'a2'},
 {id:'copy',name:'Copywriter',icon:'✍️',cls:'a3'},
 {id:'creative',name:'Criativo',icon:'🎨',cls:'a4'},
 {id:'social',name:'Social Media',icon:'📱',cls:'a5'},
 {id:'seo',name:'SEO',icon:'🔍',cls:'a6'},
 {id:'performance',name:'Performance',icon:'💰',cls:'a7'},
 {id:'analytics',name:'Analytics',icon:'📊',cls:'a8'},
 {id:'crm',name:'CRM',icon:'📧',cls:'a9'},
 {id:'growth',name:'Growth',icon:'🧪',cls:'a10'}
];
const states=Object.fromEntries(agents.map(a=>[a.id,{progress:0,status:'Aguardando'}]));
const app=document.querySelector('#app');
app.innerHTML=`<div class="shell">
<header class="topbar"><div class="brand"><div class="brand-mark">✦</div><div><strong>MarketVerse AI</strong><div class="muted">AI Marketing War Room</div></div></div><div class="live"><span class="dot"></span> <span id="liveCount">10 agentes online</span></div></header>
<main class="layout"><section class="war"><div class="grid"></div><div class="center"><div id="core" class="core">🧠</div><h2>COORDENADOR</h2><div id="task" class="task">Aguardando briefing…</div></div>
${agents.map(a=>`<article id="agent-${a.id}" class="agent ${a.cls}"><div class="agent-head"><div class="avatar">${a.icon}</div><div><strong>${a.name}</strong><small>Agente especializado</small></div></div><div class="bar"><span id="bar-${a.id}" style="width:0%"></span></div><div id="status-${a.id}" class="status">Aguardando</div></article>`).join('')}</section>
<aside class="side"><div class="side-title"><h3>Activity Feed</h3><span class="muted">Eventos reais da execução</span></div><div class="brief"><label for="brief">Briefing da campanha</label><textarea id="brief" placeholder="Ex.: Quero lançar uma campanha para uma hamburgueria em Recife, com R$ 3.000 de orçamento e foco em gerar pedidos."></textarea></div><div id="feed" class="feed"></div><div id="result" class="result hidden"></div><div class="controls"><button id="reset">Resetar</button><button id="run" class="primary">▶ Executar equipe</button></div></aside></main>
<div class="footer">War Room em tempo real • Eventos e resultados são exibidos; o raciocínio interno dos modelos nunca é exposto.</div></div>`;

const feed=document.querySelector('#feed'); const task=document.querySelector('#task'); const brief=document.querySelector('#brief'); const result=document.querySelector('#result');
function agentById(id){return agents.find(a=>a.id===id);}
function addEvent(icon,name,text){const el=document.createElement('div');el.className='event';el.innerHTML=`<b>${icon} ${name}</b><p>${text}</p>`;feed.prepend(el);while(feed.children.length>14)feed.lastChild.remove();}
function reset(){agents.forEach(a=>{states[a.id]={progress:0,status:'Aguardando'};document.querySelector(`#bar-${a.id}`).style.width='0%';document.querySelector(`#status-${a.id}`).textContent='Aguardando';document.querySelector(`#agent-${a.id}`).classList.remove('active','done','error')});feed.innerHTML='<div class="event"><b>🧠 Coordenador</b><p>War Room pronta. Informe o briefing e execute a equipe.</p></div>';result.classList.add('hidden');result.innerHTML='';task.textContent='Aguardando briefing…';document.querySelector('#core').classList.remove('active');document.querySelector('#run').disabled=false;document.querySelector('#liveCount').textContent='10 agentes online';}

function handleAgent(data){const a=agentById(data.id);if(!a)return;const s=states[data.id];s.progress=data.progress??s.progress;s.status=data.status;document.querySelector(`#bar-${a.id}`).style.width=s.progress+'%';document.querySelector(`#status-${a.id}`).textContent=data.message||data.status;const card=document.querySelector(`#agent-${a.id}`);card.classList.toggle('active',data.status==='working');card.classList.toggle('done',data.status==='completed');card.classList.toggle('error',data.status==='error');if(data.message)addEvent(a.icon,a.name,data.message);}

function run(){const text=brief.value.trim();if(!text){brief.focus();task.textContent='Escreva um briefing antes de executar.';return;}reset();document.querySelector('#run').disabled=true;document.querySelector('#core').classList.add('active');task.textContent='Coordenador distribuindo tarefas…';addEvent('🧠','Coordenador','Briefing recebido. Abrindo 10 frentes de trabalho em paralelo.');
const stream=new EventSource(`/api/campaign/stream?brief=${encodeURIComponent(text)}`);
stream.addEventListener('campaign',e=>{const d=JSON.parse(e.data);if(d.status==='started')task.textContent='10 agentes executando em paralelo…';if(d.status==='completed'){task.textContent='Campanha consolidada pelo Coordenador ✓';stream.close();document.querySelector('#core').classList.remove('active');document.querySelector('#run').disabled=false;}});
stream.addEventListener('log',e=>{const d=JSON.parse(e.data);addEvent('🧠','Coordenador',d.message);});
stream.addEventListener('agent',e=>{const d=JSON.parse(e.data);handleAgent(d);const done=agents.filter(a=>states[a.id].status==='completed').length;document.querySelector('#liveCount').textContent=`${done}/10 agentes concluídos`;});
stream.addEventListener('coordinator',e=>{const d=JSON.parse(e.data);result.classList.remove('hidden');result.innerHTML=`<div class="result-head"><span>📋</span><strong>Plano consolidado</strong></div><pre>${escapeHtml(d.output||'')}</pre>`;addEvent('🧠','Coordenador','Plano final consolidado a partir dos 10 relatórios.');});
stream.addEventListener('error',e=>{if(e.data){const d=JSON.parse(e.data);addEvent('⚠️','Sistema',d.message);task.textContent='A execução encontrou um erro.';}else{task.textContent='Conexão encerrada.';}stream.close();document.querySelector('#run').disabled=false;});
}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
document.querySelector('#run').onclick=run;document.querySelector('#reset').onclick=reset;reset();
