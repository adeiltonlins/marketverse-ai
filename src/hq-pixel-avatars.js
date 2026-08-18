// MarketVerse HQ — visual avatar layer. Runs after the existing HQ renderer.
(function(){
  const agents=document.querySelectorAll('.mv .station[data-agent]');
  if(!agents.length)return;
  const style=document.createElement('style');
  style.textContent=`
  .mv .station .pixel{font-size:0!important;width:34px!important;height:52px!important;position:absolute!important;left:50%!important;top:-10px!important;transform:translateX(-50%)!important;z-index:30!important;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))}
  .mv .station .pixel:before{content:''!important;position:absolute!important;left:8px!important;top:0!important;width:18px!important;height:18px!important;border:2px solid #17171c!important;border-radius:7px!important;background:linear-gradient(135deg,#f3c6a2 0 62%,#563a2b 63%)!important}
  .mv .station .pixel:after{content:''!important;position:absolute!important;left:5px!important;top:18px!important;width:24px!important;height:22px!important;border:2px solid #17171c!important;border-radius:7px 7px 3px 3px!important;background:linear-gradient(#55a8ef 0 55%,#252b42 56%)!important}
  .mv .station .pixel b{display:block!important;position:absolute!important;left:6px!important;top:39px!important;width:8px!important;height:11px!important;border:2px solid #17171c!important;background:#25252c!important;box-sizing:border-box!important}
  .mv .station .pixel b:after{content:'';position:absolute;left:14px;top:-2px;width:8px;height:11px;border:2px solid #17171c;background:#25252c;box-sizing:border-box}
  .mv .station[data-agent=creative] .pixel:after{background:linear-gradient(#ef6b87 0 55%,#302238 56%)!important}.mv .station[data-agent=copy] .pixel:after{background:linear-gradient(#f0b24a 0 55%,#30303b 56%)!important}.mv .station[data-agent=social] .pixel:after{background:linear-gradient(#43c7a7 0 55%,#202c38 56%)!important}.mv .station[data-agent=analytics] .pixel:after{background:linear-gradient(#a78bfa 0 55%,#25253b 56%)!important}
  .mv .station .pixel.walk{animation:mvRealWalk 3.8s steps(20,end) forwards!important}.mv .station .pixel.walk b{animation:mvLeg .18s steps(2,end) infinite}.mv .station.is-working .pixel:not(.walk){animation:mvRealWork .34s steps(2,end) infinite!important}
  @keyframes mvRealWalk{0%{transform:translateX(-50%) translate(0,0)!important}28%{transform:translateX(-50%) translate(var(--dx,0),var(--dy,0))!important}45%{transform:translateX(-50%) translate(var(--dx,0),calc(var(--dy,0) - 2px))!important}72%{transform:translateX(-50%) translate(0,0)!important}100%{transform:translateX(-50%) translate(0,0)!important}}@keyframes mvLeg{50%{transform:translateY(-2px) rotate(12deg)}}@keyframes mvRealWork{50%{transform:translateX(-50%) translateY(-2px)!important}}
  .mv .boss.nexus{z-index:80!important}.mv .boss.nexus:after{content:'';position:absolute;inset:-12px;border:1px dashed rgba(100,220,255,.4);border-radius:50%;animation:mvNexusRing 2s linear infinite;pointer-events:none}@keyframes mvNexusRing{to{transform:rotate(360deg)}}
  `;document.head.appendChild(style);
  agents.forEach(st=>{const p=st.querySelector('.pixel');if(p&&!p.querySelector('b')){const legs=document.createElement('b');p.appendChild(legs)} });
})();
