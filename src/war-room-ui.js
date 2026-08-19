// Non-invasive War Room UI layer. It only adds classes/wrappers and never replaces existing controls.
(() => {
  const boot = () => {
    const root = document.querySelector('.mv');
    const office = root?.querySelector('.office');
    const aside = root?.querySelector('#hq aside');
    if (!root || !office || !aside || root.dataset.warroomUi === '1') return;
    root.dataset.warroomUi = '1';
    aside.classList.add('operation-panel');

    const layout = [
      ['s0','11%','24%'],['s1','35%','19%'],['s2','66%','22%'],['s3','88%','30%'],
      ['s4','14%','60%'],['s5','39%','69%'],['s6','67%','64%'],['s7','88%','57%'],
      ['s8','24%','43%'],['s9','76%','42%']
    ];
    layout.forEach(([cls,left,top]) => { const el=office.querySelector('.station.'+cls); if(el){el.style.setProperty('left',left,'important');el.style.setProperty('top',top,'important');el.style.setProperty('transform','translate(-50%,-50%)','important');} });

    const title=aside.querySelector('.panel-title');
    if(title){ title.classList.add('op-sticky-head'); const label=title.querySelector('b'); if(label) label.textContent='🎛️ Central de Operação'; }
    const brief=aside.querySelector('#brief');
    if(brief) brief.setAttribute('aria-label','Briefing da campanha');
    const contact=aside.querySelector('.contact-box');
    if(contact) contact.classList.add('op-card');
    const contacts=aside.querySelector('.contacts');
    if(contacts) contacts.classList.add('op-card');
    const run=aside.querySelector('#run');
    if(run) run.classList.add('primary-run');

    // Add a compact agent selector without changing which agents the backend executes.
    if(!aside.querySelector('.agent-summary')){
      const box=document.createElement('section'); box.className='agent-summary op-card';
      box.innerHTML='<div class="agent-summary-head"><b>👥 Equipe da missão</b><small>10 agentes disponíveis</small></div><div class="agent-summary-grid"></div>';
      const grid=box.querySelector('.agent-summary-grid');
      [['research','Pesquisa'],['strategy','Estratégia'],['creative','Criativo'],['copy','Copywriter'],['social','Social Media'],['performance','Performance'],['seo','SEO'],['crm','CRM'],['analytics','Analytics'],['growth','Growth']].forEach(([id,name])=>{const x=document.createElement('button');x.type='button';x.className='agent-chip active';x.dataset.agent=id;x.textContent=name;x.onclick=()=>x.classList.toggle('active');grid.appendChild(x)});
      const anchor=brief||contact||aside.firstElementChild; if(anchor) anchor.after(box);
    }

    // Convert the old abstract brain visually into the master character while keeping #coord and setNexus() intact.
    const nexus=office.querySelector('.boss.nexus');
    if(nexus && !nexus.querySelector('.master-visual')){
      const visual=document.createElement('div'); visual.className='master-visual'; visual.setAttribute('aria-hidden','true');
      visual.innerHTML='<span class="master-chair"></span><span class="master-desk"></span><span class="master-head"></span><span class="master-body"></span><span class="master-arm left"></span><span class="master-arm right"></span>';
      nexus.appendChild(visual);
      nexus.setAttribute('aria-label','NEXUS — coordenador da War Room');
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,50)); else setTimeout(boot,50);
})();
