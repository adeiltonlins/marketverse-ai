import 'dotenv/config';
import express from 'express';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit:'8mb' }));
app.use(express.static(__dirname));

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const PERSIST_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/marketverse-persistence` : null;

const agents = [
  ['research','Pesquisa','Analise mercado, concorrentes, tendências e oportunidades.'],
  ['strategy','Estratégia','Transforme pesquisa em objetivo, público, oferta, posicionamento e plano.'],
  ['creative','Criativo','Crie conceitos visuais, formatos, roteiros e direção das peças.'],
  ['copy','Copywriter','Escreva headlines, anúncios, legendas, CTAs e mensagens de conversão.'],
  ['social','Social Media','Monte calendário, formatos, distribuição e conteúdo para redes sociais.'],
  ['performance','Performance','Estruture mídia paga, públicos, orçamento, testes e KPIs.'],
  ['seo','SEO','Defina busca local, palavras-chave, conteúdo e oportunidades orgânicas.'],
  ['crm','CRM','Crie jornada, WhatsApp, follow-ups, recuperação e segmentações.'],
  ['analytics','Analytics','Defina tracking, eventos, métricas, metas e painel de acompanhamento.'],
  ['growth','Growth','Priorize experimentos de crescimento por impacto, confiança e esforço.']
];

const send=(res,event,data)=>res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
const clean=s=>String(s??'').replace(/\u0000/g,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function persist(action,payload){
  if(!PERSIST_URL||!SUPABASE_KEY)return null;
  try{const r=await fetch(PERSIST_URL,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({action,...payload})});if(!r.ok)throw new Error(await r.text());return await r.json();}
  catch(e){console.error('Supabase persistence failed:',e?.message||e);return null;}
}
function friendlyError(error){const status=error?.status||error?.error?.code;const m=String(error?.message||'').toLowerCase();if(status===429||m.includes('quota')||m.includes('rate limit'))return 'A IA atingiu a quota ou limite de taxa. Tente novamente em instantes.';if(status===503||m.includes('unavailable')||m.includes('high demand'))return 'O serviço de IA está temporariamente congestionado. O sistema tentou recuperar automaticamente.';if(status===401||status===403||m.includes('api key'))return 'A conexão com o serviço de IA foi recusada. Verifique a configuração do servidor.';if(status===404||m.includes('not found'))return 'O serviço de IA solicitado não está disponível para esta configuração.';return 'O agente encontrou um erro ao executar sua tarefa. A operação foi marcada corretamente.';}
function retryable(error){const s=error?.status||error?.error?.code;const m=String(error?.message||'').toLowerCase();return [429,500,502,503,504].includes(s)||m.includes('unavailable')||m.includes('high demand')||m.includes('rate limit')||m.includes('temporarily');}
async function askGemini(prompt,maxOutputTokens=3200){if(!gemini)throw new Error('GEMINI_API_KEY não configurada no servidor.');const models=[MODEL,FALLBACK_MODEL].filter((v,i,a)=>v&&a.indexOf(v)===i);let last;for(const model of models){for(let attempt=0;attempt<2;attempt++){try{const r=await gemini.models.generateContent({model,contents:prompt,config:{maxOutputTokens}});return clean(r.text||'Sem conteúdo textual.');}catch(e){last=e;if(!retryable(e))throw e;if(attempt===0)await sleep(900);}}}throw last;}

async function runAgent(res,campaignId,id,name,role,briefing,context,index,total){
  const task=`Você é ${name}, especialista da MarketVerse AI. Trabalhe somente dentro do seu papel.\n\nBRIEFING ORIGINAL:\n${briefing}\n\nCONTEXTO DOS AGENTES ANTERIORES:\n${context||'Nenhum — você é o primeiro agente.'}\n\nSUA FUNÇÃO:\n${role}\n\nEntregue material acionável, específico e completo. Não invente dados; sinalize hipóteses. Termine com "ENTREGA PARA O PRÓXIMO AGENTE".`;
  send(res,'agent',{id,name,status:'working',progress:15,message:`Recebeu a tarefa ${index}/${total} e está trabalhando.`});
  if(campaignId)await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'working',progress:15,task:role});
  try{const output=await askGemini(task,2600);if(campaignId){await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'completed',progress:100,task:role,output:{text:output}});await persist('deliverable',{campaign_id:campaignId,agent_id:id,type:'agent_report',title:`${name} — entrega`,content:{text:output}});await persist('event',{campaign_id:campaignId,agent_id:id,event_type:'agent.completed',message:`${name} entregou para a próxima etapa.`});}send(res,'agent',{id,name,status:'completed',progress:100,message:'Entrega pronta. Enviando para a próxima estação.',preview:output.slice(0,420)});return{output,failed:false};}
  catch(error){const message=friendlyError(error);console.error(`[agent:${id}]`,error?.stack||error);send(res,'agent',{id,name,status:'error',progress:100,message});if(campaignId)await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'failed',progress:100,task:role,output:{error:message}});return{output:`[${name}] ${message}`,failed:true,error:message};}
}

async function runCampaign(brief,res){
  const started=Date.now();const campaignName=brief.length>90?`${brief.slice(0,87)}...`:brief;const created=await persist('create_campaign',{name:campaignName||'Nova campanha',briefing:brief});const campaignId=created?.data?.id||null;
  send(res,'campaign',{status:'started',brief,provider:'Gemini',agents:agents.length,campaignId,stages:agents.map(a=>a[0])});send(res,'log',{from:'coordinator',message:'Briefing recebido. O Coordenador montou uma cadeia de produção com handoff entre agentes.'});
  let context='';const outputs=[];let failed=0;
  for(let i=0;i<agents.length;i++){const[id,name,role]=agents[i];send(res,'stage',{current:i+1,total:agents.length,id,name,status:'starting',message:`${name} foi acionado.`});const result=await runAgent(res,campaignId,id,name,role,brief,context,i+1,agents.length);if(result.failed)failed++;outputs.push({id,name,role,output:result.output,failed:result.failed});context=`${context}\n\n### ${name} — ENTREGA RECEBIDA${result.failed?' — FALHA':''}\n${result.output}`.slice(-60000);send(res,'handoff',{from:id,to:agents[i+1]?.[0]||'coordinator',message:result.failed?`${name} não concluiu a etapa; a falha foi registrada.`:`${name} entregou o pacote para ${agents[i+1]?.[1]||'Coordenador'}.`});}
  send(res,'log',{from:'coordinator',message:'Agentes processados. Consolidando estratégia e relatório executivo.'});
  let synthesis='',synthesisFailed=false;
  try{synthesis=await askGemini(`Você é o Coordenador da MarketVerse AI. Crie a ENTREGA FINAL completa e executável para o briefing abaixo, usando as entregas dos 10 agentes. Não resuma demais.\n\nBRIEFING:\n${brief}\n\nENTREGAS:\n${context}\n\nEstruture: RESUMO EXECUTIVO; OBJETIVO; PÚBLICO; OFERTA E POSICIONAMENTO; PLANO DE CONTEÚDO; CRIATIVOS E ROTEIROS; COPYS; MÍDIA PAGA; SEO LOCAL; CRM/WHATSAPP; TRACKING E KPIs; CRONOGRAMA; CHECKLIST DE ATIVOS. Inclua PROJEÇÕES como hipóteses/metas, nunca como resultados reais.`,5200);}
  catch(error){synthesisFailed=true;failed++;synthesis=`A consolidação final não pôde ser concluída: ${friendlyError(error)}`;console.error('[coordinator]',error?.stack||error);}
  const duration=Math.round((Date.now()-started)/1000);const successful=outputs.filter(x=>!x.failed).length;
  const report=`RELATÓRIO DE EXECUÇÃO — ${campaignName}\n\nBRIEFING\n${brief}\n\nAGENTES EXECUTADOS: ${successful}/10\nFALHAS: ${failed}\nTEMPO: ${duration}s\n\n`+outputs.map((x,i)=>`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${i+1}. ${x.name.toUpperCase()}\nFUNÇÃO: ${x.role}\nSTATUS: ${x.failed?'FALHA':'CONCLUÍDO'}\n\nENTREGA:\n${x.output}`).join('\n\n')+`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCONSOLIDAÇÃO DO COORDENADOR\n${synthesis}`;
  const kit={version:'3.0',campaignId,title:campaignName,briefing:brief,generatedAt:new Date().toISOString(),durationSeconds:duration,agents:outputs.map(x=>({id:x.id,name:x.name,role:x.role,output:x.output,failed:x.failed})),finalCampaign:synthesis,executionReport:report,status:failed?'completed_with_errors':'completed'};
  if(campaignId){await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'final_campaign',title:'Pacote final da campanha',content:{text:synthesis}});await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'execution_report',title:'Relatório executivo',content:{text:report}});await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'campaign_kit',title:'Kit completo da campanha',content:kit});await persist('event',{campaign_id:campaignId,event_type:failed?'campaign.completed_with_errors':'campaign.completed',message:failed?`Campanha concluída com ${failed} falha(s).`:'Coordenador finalizou campanha, relatório e kit.'});await persist('complete_campaign',{campaign_id:campaignId,status:failed?'completed_with_errors':'completed'});}
  send(res,'coordinator',{status:synthesisFailed?'error':failed?'completed_with_errors':'completed',output:synthesis,report,kit,deliverables:{pdf:true,kit:true,report:true},failed});send(res,'campaign',{status:failed?'completed_with_errors':'completed',durationMs:Date.now()-started,successful,failed,campaignId});res.end();
}

function pdfWrap(doc,text,x,y,width,size=9){doc.fontSize(size);const lines=String(text||'').split(/\r?\n/);for(const line of lines){if(!line.trim()){y+=size+5;continue}const h=doc.heightOfString(line,{width,lineGap:2});if(y+h>770){doc.addPage();y=55}doc.text(line,x,y,{width,lineGap:2});y+=h+4;}return y;}
function drawCard(doc,x,y,w,h,label,value,sub=''){doc.roundedRect(x,y,w,h,10).fill('#0d1722');doc.fillColor('#7d91a5').fontSize(8).text(label.toUpperCase(),x+12,y+10,{width:w-24});doc.fillColor('#f4f8fc').fontSize(19).text(String(value),x+12,y+27,{width:w-24});if(sub)doc.fillColor('#7d91a5').fontSize(7).text(sub,x+12,y+h-16,{width:w-24});}
function makeExecutivePdf(data){
  const doc=new PDFDocument({size:'A4',margin:42,bufferPages:true});const chunks=[];doc.on('data',c=>chunks.push(c));
  const title=clean(data.title||'Nova campanha');const brief=clean(data.briefing||'');const kit=data.kit||{};const list=Array.isArray(kit.agents)?kit.agents:[];const successful=list.filter(a=>!a.failed).length;const failures=list.filter(a=>a.failed).length;const duration=kit.durationSeconds||0;
  doc.rect(0,0,595,842).fill('#07101a');doc.fillColor('#4de8ff').fontSize(10).text('MARKETVERSE AI  /  EXECUTIVE INTELLIGENCE',42,46);doc.fillColor('#ffffff').fontSize(28).text('Relatório de Campanha',42,78,{width:510});doc.fillColor('#a7b6c5').fontSize(13).text(title,42,116,{width:510});doc.fillColor('#71859a').fontSize(8).text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,42,145);
  drawCard(doc,42,180,120,76,'AGENTES',''+list.length,'pipeline');drawCard(doc,172,180,120,76,'CONCLUÍDOS',''+successful,'entregas válidas');drawCard(doc,302,180,120,76,'FALHAS',''+failures,'registradas');drawCard(doc,432,180,121,76,'TEMPO',duration+'s','execução');
  doc.fillColor('#4de8ff').fontSize(9).text('BRIEFING',42,286);doc.fillColor('#dbe5ef').fontSize(10);let y=304;y=pdfWrap(doc,brief,42,y,510,10);
  doc.fillColor('#4de8ff').fontSize(9).text('MAPA DE EXECUÇÃO',42,y+14);y+=34;
  list.forEach((a,i)=>{if(y>750){doc.addPage();y=50}const status=a.failed?'FALHA':'OK';doc.fillColor(a.failed?'#ff667a':'#61f2a5').circle(50,y+6,4).fill();doc.fillColor('#eaf1f7').fontSize(9).text(`${String(i+1).padStart(2,'0')}  ${a.name}`,62,y);doc.fillColor('#71859a').fontSize(7).text(a.role,190,y,{width:235});doc.fillColor(a.failed?'#ff8b99':'#7fe9c0').fontSize(8).text(status,485,y);y+=18;});
  doc.addPage();doc.rect(0,0,595,842).fill('#07101a');doc.fillColor('#4de8ff').fontSize(9).text('STRATEGIC OUTPUT',42,45);doc.fillColor('#fff').fontSize(21).text('Plano executivo',42,68);y=108;
  const sections=['RESUMO EXECUTIVO','OBJETIVO','PÚBLICO','OFERTA E POSICIONAMENTO','PLANO DE CONTEÚDO','CRIATIVOS E ROTEIROS','COPYS','MÍDIA PAGA','SEO LOCAL','CRM/WHATSAPP','TRACKING E KPIs','CRONOGRAMA','CHECKLIST DE ATIVOS'];
  const final=clean(kit.finalCampaign||data.output||'');const blocks=final.split(/\n(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 /&-]{3,}:?\s*$)/m);let found=false;
  for(const b of blocks){if(!b.trim())continue;const first=b.split('\n')[0].replace(/[:#]/g,'').trim();const matched=sections.find(s=>first.toUpperCase().includes(s));if(matched){if(y>690){doc.addPage();y=50}doc.fillColor('#4de8ff').fontSize(9).text(matched,y);y+=15;const body=b.split('\n').slice(1).join('\n');doc.fillColor('#d8e3ec');y=pdfWrap(doc,body,42,y,510,9);y+=10;found=true;}}
  if(!found){doc.fillColor('#d8e3ec');y=pdfWrap(doc,final,42,y,510,9);}
  doc.addPage();doc.rect(0,0,595,842).fill('#07101a');doc.fillColor('#4de8ff').fontSize(9).text('AGENT DELIVERABLES',42,45);doc.fillColor('#fff').fontSize(21).text('Inteligência por estação',42,68);y=108;
  for(const a of list){if(y>700){doc.addPage();doc.rect(0,0,595,842).fill('#07101a');y=50}doc.fillColor(a.failed?'#ff667a':'#61f2a5').fontSize(9).text(`${a.name}  •  ${a.failed?'FALHA':'CONCLUÍDO'}`,42,y);y+=14;doc.fillColor('#8ea0b2').fontSize(8).text(a.role,42,y);y+=14;doc.fillColor('#d8e3ec');y=pdfWrap(doc,a.output,42,y,510,8);y+=12;}
  doc.addPage();doc.rect(0,0,595,842).fill('#07101a');doc.fillColor('#4de8ff').fontSize(9).text('MANAGEMENT DASHBOARD',42,45);doc.fillColor('#fff').fontSize(21).text('Painel de gestão',42,68);drawCard(doc,42,115,160,90,'EXECUÇÃO',`${successful}/${list.length}`,'agentes concluídos');drawCard(doc,218,115,160,90,'QUALIDADE',failures?'Revisar':'OK',failures?'há falhas para revisar':'cadeia sem falhas');drawCard(doc,394,115,159,90,'STATUS',kit.status==='completed'?'CONCLUÍDO':'COM ERROS','resultado da operação');
  doc.fillColor('#4de8ff').fontSize(9).text('LEITURA EXECUTIVA',42,245);doc.fillColor('#d8e3ec').fontSize(10).text('O dashboard separa claramente dados observados da operação de hipóteses estratégicas. Métricas de mídia, vendas e conversão só devem ser consideradas reais quando conectadas a dados de campanha.',42,265,{width:510,lineGap:4});doc.fillColor('#71859a').fontSize(8).text('MarketVerse AI • Relatório gerado automaticamente a partir dos eventos e entregas da operação.',42,760);
  doc.end();return new Promise(resolve=>doc.on('end',()=>resolve(Buffer.concat(chunks))));
}

app.post('/api/campaign/pdf',async(req,res)=>{try{const pdf=await makeExecutivePdf({title:req.body?.title,briefing:req.body?.briefing,output:req.body?.output,kit:req.body?.kit||{}});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="marketverse-relatorio-${Date.now()}.pdf"`);res.send(pdf);}catch(e){console.error('PDF generation failed:',e?.stack||e);res.status(500).json({error:'Não foi possível gerar o relatório executivo.'});}});

app.get('/api/campaign/stream',async(req,res)=>{const brief=String(req.query.brief||'').trim();res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('Cache-Control','no-cache, no-transform');res.setHeader('Connection','keep-alive');res.flushHeaders?.();if(!brief){send(res,'error',{message:'Informe o briefing da campanha.'});return res.end();}if(!gemini){send(res,'error',{message:'O motor de IA não está configurado no servidor.'});return res.end();}try{await runCampaign(brief,res);}catch(error){console.error(error);send(res,'error',{message:friendlyError(error)});res.end();}});
app.get('/api/health',(_req,res)=>res.json({ok:true,provider:'Gemini',geminiConfigured:Boolean(gemini),supabaseConfigured:Boolean(PERSIST_URL&&SUPABASE_KEY),agents:agents.length,pipeline:'sequential-handoff',deliverables:['executive_pdf','campaign_kit','execution_report']}));
const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`MarketVerse AI running on :${port} | pipeline=sequential-handoff | provider=Gemini`));
