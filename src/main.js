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
const states={}; agents.forEach((a,i)=>states[a.id]={progress:0,status:i<2?'Preparando…':'Aguardando',active:i<2});
const app=document.querySelector('#app');
app.innerHTML=`<div class="shell">
<header class="topbar"><div class="brand"><div class="brand-mark">✦</div><div><strong>MarketVerse AI</strong><div class="muted">AI Marketing War Room</div></div></div><div class="live"><span class="dot"></span> 10 agentes online</div></header>
<main class="layout"><section class="war"><div class="grid"></div><div class="center"><div id="core" class="core active">🧠</div><h2>COORDENADOR</h2><div id="task" class="task">Distribuindo tarefas para a equipe…</div></div>
${agents.map(a=>`<article id="agent-${a.id}" class="agent ${a.cls} active"><div class="agent-head"><div class="avatar">${a.icon}</div><div><strong>${a.name}</strong><small>Agente especializado</small></div></div><div class="bar"><span id="bar-${a.id}" style="width:0%"></span></div><div id="status-${a.id}" class="status">Preparando…</div></article>`).join('')}</section>
<aside class="side"><div class="side-title"><h3>Activity Feed</h3><span class="muted">A equipe está trabalhando em paralelo</span></div><div id="feed" class="feed"></div><div class="controls"><button id="reset">Resetar</button><button id="run" class="primary">▶ Nova campanha</button></div></aside></main>
<div class="footer">Protótipo V1 • War Room visual • O raciocínio interno dos modelos nunca é exposto.</div></div>`;
const feed=document.querySelector('#feed'); const task=document.querySelector('#task');
const activities=[
 ['research','Recebendo briefing da campanha…'],['strategy','Definindo objetivo, público e posicionamento…'],['copy','Criando variações de headlines…'],['creative','Gerando conceitos visuais para os anúncios…'],['social','Montando calendário de conteúdo…'],['seo','Mapeando oportunidades de busca…'],['performance','Estruturando testes de aquisição…'],['crm','Desenhando a jornada de leads…'],['growth','Selecionando experimentos de crescimento…'],['analytics','Preparando KPIs e critérios de sucesso…']
];
function addEvent(id,text){const a=agents.find(x=>x.id===id);const el=document.createElement('div');el.className='event';el.innerHTML=`<b>${a.icon} ${a.name}</b><p>${text}</p>`;feed.prepend(el);while(feed.children.length>12)feed.lastChild.remove()}
let timer;
function run(){clearInterval(timer);feed.innerHTML='';agents.forEach((a,i)=>{states[a.id]={progress:Math.max(0,Math.floor(Math.random()*12)),status:'Aguardando',active:false};});document.querySelector('#core').classList.add('active');task.textContent='Coordenador distribuindo tarefas…';let tick=0;timer=setInterval(()=>{tick++;agents.forEach((a,i)=>{const s=states[a.id];if(tick===1+i%3){s.active=true;s.status='Trabalhando…';addEvent(a.id,activities[i][1]);}if(s.active&&s.progress<100)s.progress=Math.min(100,s.progress+Math.floor(7+Math.random()*15));if(s.progress>=100){s.active=false;s.status='Concluído ✓';}document.querySelector(`#bar-${a.id}`).style.width=s.progress+'%';document.querySelector(`#status-${a.id}`).textContent=s.status;document.querySelector(`#agent-${a.id}`).classList.toggle('active',s.active);});if(tick%3===0)task.textContent=`${agents.filter(a=>states[a.id].progress<100).length} agentes executando tarefas em paralelo…`;if(agents.every(a=>states[a.id].progress>=100)){clearInterval(timer);task.textContent='Campanha analisada e consolidada ✓';document.querySelector('#core').classList.remove('active');addEvent('strategy','O Coordenador consolidou os resultados da equipe.');}},650)}
function reset(){clearInterval(timer);feed.innerHTML='<div class="event"><b>🧠 Coordenador</b><p>War Room pronta. Inicie uma campanha para distribuir o trabalho.</p></div>';agents.forEach(a=>{states[a.id]={progress:0,status:'Aguardando',active:false};document.querySelector(`#bar-${a.id}`).style.width='0%';document.querySelector(`#status-${a.id}`).textContent='Aguardando';document.querySelector(`#agent-${a.id}`).classList.remove('active')});task.textContent='Aguardando briefing…';document.querySelector('#core').classList.remove('active')}
document.querySelector('#run').onclick=run;document.querySelector('#reset').onclick=reset;reset();
