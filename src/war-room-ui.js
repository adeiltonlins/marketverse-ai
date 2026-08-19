// MarketVerse — War Room presentation layer
// Keeps the existing campaign logic intact and reorganizes only the visual/control layer.
(() => {
  const boot = () => {
    const root = document.querySelector('.mv');
    const office = root?.querySelector('.office');
    const aside = root?.querySelector('#hq + aside, #hq aside');
    if (!root || !office || !aside || root.dataset.warroomUi === '1') return;
    root.dataset.warroomUi = '1';

    // Replace abstract brain with a master character.
    const nexus = office.querySelector('.boss.nexus');
    if (nexus) {
      nexus.setAttribute('aria-label', 'NEXUS — coordenador da War Room');
      nexus.innerHTML = `
        <div class="master-chair" aria-hidden="true"></div>
        <div class="master-desk" aria-hidden="true"><span></span><i></i></div>
        <div class="master-avatar" aria-hidden="true"><b class="master-hair"></b><b class="master-face"></b><b class="master-body"></b><b class="master-arm a"></b><b class="master-arm b"></b></div>
        <div class="master-status" id="coord">Aguardando briefing…</div>
        <strong>NEXUS</strong><small>COORDENADOR</small>`;
    }

    // Give the room deliberate, non-grid stations. JS movement continues to use the existing classes.
    const layout = [
      ['s0','11%','24%'], ['s1','35%','19%'], ['s2','66%','22%'], ['s3','88%','30%'],
      ['s4','14%','60%'], ['s5','39%','69%'], ['s6','67%','64%'], ['s7','88%','57%'],
      ['s8','24%','43%'], ['s9','76%','42%']
    ];
    layout.forEach(([cls,left,top]) => { const el=office.querySelector('.station.'+cls); if(el){el.style.setProperty('left',left,'important');el.style.setProperty('top',top,'important');el.style.setProperty('transform','translate(-50%,-50%)','important');} });

    aside.classList.add('operation-panel');
    aside.innerHTML = `
      <div class="op-head"><div><small>WAR ROOM • CONTROLE</small><h2>Central de Operação</h2><p>Monte a missão, escolha os agentes e envie o trabalho para o NEXUS.</p></div><span class="op-live">● AO VIVO</span></div>
      <section class="op-section campaign-section"><div class="section-title"><span>01</span><div><b>Briefing da campanha</b><small>O que a equipe precisa executar?</small></div></div><textarea id="brief" placeholder="Descreva objetivo, público, oferta, orçamento, prazo e canais…"></textarea></section>
      <section class="op-section"><div class="section-title"><span>02</span><div><b>Equipe da missão</b><small>Selecione quem vai trabalhar nesta operação.</small></div><em id="stage">0/10</em></div><div class="agent-picker">${[['research','Pesquisa','🔎'],['strategy','Estratégia','♟'],['creative','Criativo','🎨'],['copy','Copywriter','✍'],['social','Social Media','📱'],['performance','Performance','⚡'],['seo','SEO','⌕'],['crm','CRM','✉'],['analytics','Analytics','▥'],['growth','Growth','↗']].map(a=>`<label class="agent-choice"><input type="checkbox" checked data-agent-select="${a[0]}"><span class="choice-avatar">${a[2]}</span><span><b>${a[1]}</b><small>Disponível</small></span><i>✓</i></label>`).join('')}</div></section>
      <section class="op-section"><div class="section-title"><span>03</span><div><b>Identidade e canais</b><small>Informações que entram na campanha e no relatório.</small></div></div><div class="form-grid"><label>Empresa / cliente<input id="clientName" placeholder="Nome da empresa"></label><label>Instagram<input id="clientInstagram" placeholder="@perfil"></label><label>WhatsApp<input id="clientWhatsapp" placeholder="+55 …"></label></div></section>
      <section class="op-section dispatch-section"><div class="section-title"><span>04</span><div><b>CRM e disparo</b><small>Somente contatos que autorizaram comunicação.</small></div></div><textarea id="recipientList" placeholder="Um contato por linha…"></textarea><div class="dispatch"><button id="prepareDispatch" class="secondary">⚡ Preparar disparo</button><button id="clearContacts" class="ghost">Limpar</button></div></section>
      <div class="op-bottom"><div class="op-metrics"><div><b id="mTasks">0/10</b><small>Tarefas</small></div><div><b id="mActive">0</b><small>Ativos</small></div><div><b id="mDone">0</b><small>Concluídos</small></div></div><button id="run" class="primary-run">🚀 INICIAR OPERAÇÃO</button></div>
      <div id="feed" class="feed"></div><div id="delivery" class="delivery hidden"></div>`;

    // Preserve dispatch controls created by the original logic through the same IDs.
    document.querySelectorAll('.agent-choice input').forEach(input => input.addEventListener('change', () => {
      const count = document.querySelectorAll('.agent-choice input:checked').length;
      const stage = document.querySelector('#stage'); if(stage) stage.textContent = `${count}/10`;
    }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0)); else setTimeout(boot, 0);
})();
