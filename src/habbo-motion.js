/* MarketVerse — movimento físico dos personagens pela sala. */
const $ = (s) => document.querySelector(s);

function installMotion() {
  const office = $('.office');
  const boss = $('.boss');
  if (!office || !boss) return false;

  const agents = [...office.querySelectorAll('.station .pixel')];

  agents.forEach((pixel) => {
    const station = pixel.closest('.station');
    if (!station || pixel.dataset.motionReady) return;
    pixel.dataset.motionReady = '1';

    // Calcula a distância real entre o personagem e o centro do Coordenador.
    // Isso evita depender de posições fixas e funciona em desktop/mobile.
    const setPath = () => {
      const p = pixel.getBoundingClientRect();
      const b = boss.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (p.left + p.width / 2);
      const dy = (b.top + b.height / 2) - (p.top + p.height / 2) + 18;
      pixel.style.setProperty('--dx', `${Math.round(dx)}px`);
      pixel.style.setProperty('--dy', `${Math.round(dy)}px`);
    };

    const observer = new MutationObserver(() => {
      if (!pixel.classList.contains('walk')) return;
      setPath();
      // Reinicia a animação sempre que um novo agente é chamado.
      pixel.style.animation = 'none';
      void pixel.offsetWidth;
      pixel.style.animation = '';
    });
    observer.observe(pixel, { attributes: true, attributeFilter: ['class'] });
    station.addEventListener('click', setPath);
    window.addEventListener('resize', () => {
      if (!pixel.classList.contains('walk')) setPath();
    }, { passive: true });
    setPath();
  });
  return true;
}

// hq-next.js cria a sala dinamicamente; espera até ela existir.
let tries = 0;
const timer = setInterval(() => {
  if (installMotion() || ++tries > 80) clearInterval(timer);
}, 100);
