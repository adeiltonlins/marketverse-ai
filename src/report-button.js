(() => {
  let latest = null;
  const original = EventSource.prototype.addEventListener;
  EventSource.prototype.addEventListener = function(type, listener, options) {
    if (type === 'coordinator') {
      const wrapped = (event) => {
        try {
          latest = JSON.parse(event.data);
          window.__MARKETVERSE_LAST_RESULT__ = latest;
          window.__MARKETVERSE_ENABLE_PDF__?.();
        } catch {}
        return listener.call(this, event);
      };
      return original.call(this, type, wrapped, options);
    }
    return original.call(this, type, listener, options);
  };
  const install = () => {
    const box = document.querySelector('.operation-box');
    if (!box || document.querySelector('#pdf-report')) return;
    const button = document.createElement('button');
    button.id = 'pdf-report'; button.className = 'report-neural'; button.type = 'button';
    button.textContent = '📊 Gerar PDF executivo'; button.disabled = !latest;
    button.title = latest ? 'Baixar relatório executivo.' : 'Execute uma campanha primeiro.';
    box.appendChild(button);
    window.__MARKETVERSE_ENABLE_PDF__ = () => { button.disabled = false; button.title = 'Baixar relatório executivo com dados, KPIs e entregas dos agentes.'; };
    button.addEventListener('click', async () => {
      const result = window.__MARKETVERSE_LAST_RESULT__ || latest;
      if (!result?.kit) return;
      button.disabled = true; button.textContent = '⏳ Gerando relatório...';
      try {
        const response = await fetch('/api/campaign/pdf', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:result.kit.title,briefing:result.kit.briefing,output:result.output,kit:result.kit})});
        if (!response.ok) throw new Error('Falha ao gerar PDF');
        const blob = await response.blob(); const url = URL.createObjectURL(blob); const a=document.createElement('a');
        a.href=url; a.download='marketverse-relatorio-executivo.pdf'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
      } catch { alert('Não foi possível gerar o relatório executivo. Verifique o status do servidor.'); }
      finally { button.disabled=false; button.textContent='📊 Gerar PDF executivo'; }
    });
  };
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true}); install();
})();
