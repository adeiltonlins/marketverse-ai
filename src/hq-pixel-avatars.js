// MarketVerse HQ — organized pixel avatar + movement layer
(function(){
  const boot=()=>{
    const root=document.querySelector('.mv');
    if(!root)return;
    if(document.getElementById('mv-avatar-style'))return;
    const style=document.createElement('style');style.id='mv-avatar-style';style.textContent=`
      .mv .station{z-index:20}.mv .station .pixel{font-size:0!important;width:36px!important;height:54px!important;left:50%!important;top:-12px!important;transform:translateX(-50%)!important;z-index:50!important;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.4))}
      .mv .station .pixel:before{content:''!important;position:absolute!important;left:9px!important;top:0!important;width:18px!important;height:18px!important;border:2px solid #17171c!important;border-radius:7px 7px 6px 6px!important;background:linear-gradient(135deg,#f3c6a2 0 62%,#563a2b 63%)!important}
      .mv .station .pixel:after{content:''!important;position:absolute!important;left:5px!important;top:18px!important;width:26px!important;height:23px!important;border:2px solid #17171c!important;border-radius:7px 7px 3px 3px!important;background:linear-gradient(#55a8ef 0 55%,#252b42 56%)!important}
      .mv .station .pixel b,.mv .station .pixel b:after{position:absolute!important;display:block!important;top:40px!important;width:8px!important;height:12px!important;border:2px solid #17171c!important;background:#25252c!important;box-sizing:border-box!important;content:''!important}
      .mv .station .pixel b{left:6px!important}.mv .station .pixel b:after{left:14px!important;top:-2px!important}
      .mv .station[data-agent=creative] .pixel:after{background:linear-gradient(#ef6b87 0 55%,#302238 56%)!important}.mv .station[data-agent=copy] .pixel:after{background:linear-gradient(#f0b24a 0 55%,#30303b 56%)!important}.mv .station[data-agent=social] .pixel:after{background:linear-gradient(#43c7a7 0 55%,#202c38 56%)!important}.mv .station[data-agent=analytics] .pixel:after{background:linear-gradient(#a78bfa 0 55%,#25253b 56%)!important}
      .mv .station .pixel.walk{animation:mvWalkRoom 3.8s linear forwards!important;z-index:120!important}.mv .station .pixel.walk b{animation:mvWalkLegs .18s steps(2,end) infinite}.mv .station.is-working .pixel:not(.walk){animation:mvWorkRoom .42s steps(2,end) infinite!important}
      .mv .station .pixel.working:after{content:'TRABALHANDO';position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);padding:4px 7px;background:#fff;color:#17171c;border:2px solid #17171c;border-radius:7px;box-shadow:2px 2px #17171c;font:800 8px/1 Inter,Arial,sans-serif;white-space:nowrap}
      .mv .boss.nexus{z-index:160!important}.mv .boss.nexus:after{content:'';position:absolute;inset:-14px;border:2px dashed rgba(100,220,255,.45);border-radius:50%;animation:mvNexusOrbit 2.2s linear infinite;pointer-events:none}.mv .boss.nexus.dispatching:before{content:'⚡ NEXUS • DISTRIBUINDO';position:absolute;top:-25px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#8ee9ff;font:800 9px Inter,Arial,sans-serif;letter-spacing:.08em}
      @keyframes mvWalkRoom{0%{transform:translateX(-50%) translate(0,0)!important}25%{transform:translateX(-50%) translate(var(--dx,0),var(--dy,0))!important}45%{transform:translateX(-50%) translate(var(--dx,0),calc(var(--dy,0) - 2px))!important}70%{transform:translateX(-50%) translate(0,0)!important}100%{transform:translateX(-50%) translate(0,0)!important}}@keyframes mvWalkLegs{50%{transform:translateY(-2px) rotate(14deg)}}@keyframes mvWorkRoom{50%{transform:translateX(-50%) translateY(-2px)!important}}@keyframes mvNexusOrbit{to{transform:rotate(360deg)}}
    `;document.head.appendChild(style);
    const agents=root.querySelectorAll('.station[data-agent]');
    agents.forEach((st,i)=>{
      const p=st.querySelector('.pixel');if(!p)return;
      if(!p.querySelector('b'))p.appendChild(document.createElement('b'));
      const angle=(i/agents.length)*Math.PI*2;const radius=150; p.style.setProperty('--dx',`${Math.round(Math.cos(angle)*radius)}px`);p.style.setProperty('--dy',`${Math.round(Math.sin(angle)*radius)}px`);
      st.dataset.homeX='0';st.dataset.homeY='0';
    });
    const nexus=root.querySelector('.boss.nexus');if(nexus)nexus.setAttribute('data-role','central-coordinator');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
  const obs=new MutationObserver(()=>boot());obs.observe(document.documentElement,{childList:true,subtree:true});
})();
