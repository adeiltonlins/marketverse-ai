/* MarketVerse HQ — camada viva: balões, estados e inspeção dos agentes */
(() => {
  const labels = {
    research:'🔎 Pesquisando referências…', strategy:'🧠 Definindo estratégia…', creative:'🎨 Criando conceito visual…',
    copy:'✍️ Escrevendo copy…', social:'📱 Preparando publicação…', performance:'💰 Otimizando campanha…',
    seo:'🔍 Trabalhando SEO…', crm:'📧 Organizando CRM…', analytics:'📊 Analisando dados…', growth:'🧪 Testando crescimento…'
  };
  const roles = { research:'Pesquisa',strategy:'Estratégia',creative:'Criativo',copy:'Copywriter',social:'Social Media',performance:'Performance',seo:'SEO',crm:'CRM',analytics:'Analytics',growth:'Growth' };
  const ensurePanel = () => {
    if (document.querySelector('.mv-agent-inspector')) return;
    const p=document.createElement('div'); p.className='mv-agent-inspector hidden'; p.innerHTML='<button class="mv-inspector-close">×</button><small>AGENTE</small><h3></h3><p></p><div class="mv-inspector-status">Aguardando</div><div class="mv-inspector-line"></div><span>Clique em outro personagem para acompanhar.</span>'; document.body.appendChild(p);
    p.querySelector('.mv-inspector-close').onclick=()=>p.classList.add('hidden');
  };
  const show = id => {
    ensurePanel(); const p=document.querySelector('.mv-agent-inspector'), title=p.querySelector('h3'), text=p.querySelector('p'), status=p.querySelector('.mv-inspector-status');
    title.textContent=roles[id]||id; text.textContent=labels[id]||'Acompanhando tarefa…';
    const station=document.querySelector(`.station[data-agent="${id}"]`), st=station?.querySelector('small'); status.textContent=st?.textContent||'Aguardando'; p.classList.remove('hidden');
  };
  const bind = () => document.querySelectorAll('.station').forEach(station => {
    if(station.dataset.lifeBound) return; station.dataset.lifeBound='1';
    station.addEventListener('click', e => { if(e.target.closest('.progress,.desk')) return; show(station.dataset.agent); });
    const pixel=station.querySelector('.pixel'); if(pixel) pixel.title='Clique para acompanhar este agente';
  });
  const obs=new MutationObserver(bind); obs.observe(document.body,{childList:true,subtree:true});
  bind(); ensurePanel();
})();
