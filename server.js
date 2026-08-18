import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(__dirname));

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const PERSIST_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/marketverse-persistence` : null;

const agents = [
  ['research','Pesquisa','Analise mercado, concorrentes, tendências e oportunidades.'],
  ['strategy','Estratégia','Transforme o briefing e a pesquisa em objetivo, público, oferta, posicionamento e plano.'],
  ['creative','Criativo','Crie conceitos visuais, formatos, roteiros e direção das peças usando o contexto recebido.'],
  ['copy','Copywriter','Escreva headlines, anúncios, legendas, CTAs e mensagens de conversão usando o contexto recebido.'],
  ['social','Social Media','Monte calendário, formatos, distribuição e conteúdo para redes sociais.'],
  ['performance','Performance','Estruture mídia paga, públicos, orçamento, testes e KPIs.'],
  ['seo','SEO','Defina busca local, palavras-chave, conteúdo e oportunidades orgânicas.'],
  ['crm','CRM','Crie jornada, WhatsApp, follow-ups, recuperação e segmentações.'],
  ['analytics','Analytics','Defina tracking, eventos, métricas, metas e painel de acompanhamento.'],
  ['growth','Growth','Priorize experimentos de crescimento por impacto, confiança e esforço.']
];

const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
const clean = s => String(s ?? '').replace(/\u0000/g, '');

async function persist(action, payload) {
  if (!PERSIST_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(PERSIST_URL, { method:'POST', headers:{'Content-Type':'application/json', apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`}, body:JSON.stringify({action,...payload}) });
    if (!r.ok) throw new Error(await r.text());
    return await r.json();
  } catch (e) { console.error('Supabase persistence failed:', e?.message || e); return null; }
}

function friendlyError(error) {
  const status = error?.status || error?.error?.code;
  const message = String(error?.message || '').toLowerCase();
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) return 'A API Gemini atingiu a quota ou limite de taxa.';
  if (status === 401 || status === 403 || message.includes('api key')) return 'A chave Gemini foi recusada. Verifique GEMINI_API_KEY.';
  if (status === 404 || message.includes('not found')) return `O modelo ${MODEL} não está disponível para esta chave/projeto.`;
  return 'O agente encontrou um erro ao chamar o Gemini.';
}

async function askGemini(prompt, maxOutputTokens = 3200) {
  const response = await gemini.models.generateContent({ model:MODEL, contents:prompt, config:{maxOutputTokens, temperature:0.7} });
  return clean(response.text || 'Sem conteúdo textual.');
}

async function runAgent(res, campaignId, id, name, role, briefing, context, index, total) {
  const task = `Você é ${name}, especialista da MarketVerse AI. Trabalhe somente dentro do seu papel.\n\nBRIEFING ORIGINAL:\n${briefing}\n\nCONTEXTO ENTREGUE PELOS AGENTES ANTERIORES:\n${context || 'Nenhum — você é o primeiro agente desta etapa.'}\n\nSUA FUNÇÃO:\n${role}\n\nEntregue material acionável, completo e específico para o briefing. Não invente dados; sinalize hipóteses. Termine com "ENTREGA PARA O PRÓXIMO AGENTE".`;
  send(res,'agent',{id,name,status:'working',progress:15,message:`Recebeu a tarefa ${index}/${total} e está trabalhando.`});
  if (campaignId) await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'working',progress:15,task:role});
  try {
    const output = await askGemini(task, 2600);
    if (campaignId) {
      await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'completed',progress:100,task:role,output:{text:output}});
      await persist('deliverable',{campaign_id:campaignId,agent_id:id,type:'agent_report',title:`${name} — entrega`,content:{text:output}});
      await persist('event',{campaign_id:campaignId,agent_id:id,event_type:'agent.completed',message:`${name} entregou para a próxima etapa.`});
    }
    send(res,'agent',{id,name,status:'completed',progress:100,message:'Entrega pronta. Enviando para a próxima estação.',preview:output.slice(0,420)});
    return output;
  } catch (error) {
    const message = friendlyError(error);
    send(res,'agent',{id,name,status:'error',progress:100,message});
    if (campaignId) await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'failed',progress:100,task:role,output:{error:message}});
    return `[${name}] ${message}`;
  }
}

async function runCampaign(brief, res) {
  const started = Date.now();
  const campaignName = brief.length > 90 ? `${brief.slice(0,87)}...` : brief;
  const created = await persist('create_campaign',{name:campaignName || 'Nova campanha',briefing:brief});
  const campaignId = created?.data?.id || null;
  send(res,'campaign',{status:'started',brief,model:MODEL,provider:'Gemini',agents:agents.length,campaignId,stages:agents.map(a=>a[0])});
  send(res,'log',{from:'coordinator',message:'Briefing recebido. O Coordenador montou uma cadeia de produção: cada estação recebe a entrega da anterior.'});

  let context = '';
  const outputs = [];
  for (let i=0;i<agents.length;i++) {
    const [id,name,role] = agents[i];
    send(res,'stage',{current:i+1,total:agents.length,id,name,status:'starting',message:`${name} foi acionado.`});
    const output = await runAgent(res,campaignId,id,name,role,brief,context,i+1,agents.length);
    outputs.push({id,name,role,output});
    context = `${context}\n\n### ${name} — ENTREGA RECEBIDA\n${output}`.slice(-60000);
    send(res,'handoff',{from:id,to:agents[i+1]?.[0] || 'coordinator',message:`${name} entregou o pacote para ${agents[i+1]?.[1] || 'Coordenador'}.`});
  }

  send(res,'log',{from:'coordinator',message:'Todas as estações concluíram. O Coordenador está consolidando o pacote e o relatório dos agentes.'});
  const synthesis = await askGemini(`Você é o Coordenador da MarketVerse AI. Crie a ENTREGA FINAL completa e executável para o briefing abaixo, usando as entregas dos 10 agentes. Não resuma demais.\n\nBRIEFING:\n${brief}\n\nENTREGAS DOS AGENTES:\n${context}\n\nEstruture exatamente nestas áreas: RESUMO EXECUTIVO; OBJETIVO; PÚBLICO; OFERTA E POSICIONAMENTO; PLANO DE CONTEÚDO; CRIATIVOS E ROTEIROS; COPYS; MÍDIA PAGA; SEO LOCAL; CRM/WHATSAPP; TRACKING E KPIs; CRONOGRAMA DE EXECUÇÃO; CHECKLIST DE ATIVOS. No final inclua PROJEÇÕES, claramente marcadas como hipóteses/metas e nunca como resultados reais. Gere recomendações práticas.`, 5200);

  const report = `RELATÓRIO DE EXECUÇÃO — ${campaignName}\n\nBRIEFING\n${brief}\n\nAGENTES EXECUTADOS: ${outputs.length}/10\nTEMPO: ${Math.round((Date.now()-started)/1000)}s\n\n` + outputs.map((x,i)=>`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${i+1}. ${x.name.toUpperCase()}\nFUNÇÃO: ${x.role}\nSTATUS: CONCLUÍDO\n\nENTREGA DO AGENTE:\n${x.output}`).join('\n\n') + `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCONSOLIDAÇÃO DO COORDENADOR\nO Coordenador recebeu as 10 entregas acima e gerou o pacote final abaixo.\n\n${synthesis}`;

  const kit = {
    version:'2.0', campaignId, title:campaignName, briefing:brief,
    generatedAt:new Date().toISOString(), durationSeconds:Math.round((Date.now()-started)/1000),
    agents:outputs.map(x=>({id:x.id,name:x.name,role:x.role,output:x.output})),
    finalCampaign:synthesis, executionReport:report
  };

  if (campaignId) {
    await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'final_campaign',title:'Pacote final da campanha',content:{text:synthesis,agents:outputs.map(x=>({id:x.id,name:x.name}))}});
    await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'execution_report',title:'Relatório dos 10 agentes',content:{text:report}});
    await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'campaign_kit',title:'Kit completo da campanha',content:kit});
    await persist('event',{campaign_id:campaignId,event_type:'campaign.completed',message:'Coordenador finalizou campanha, relatório e kit completo.'});
    await persist('complete_campaign',{campaign_id:campaignId,status:'completed'});
  }
  send(res,'coordinator',{status:'completed',output:synthesis,report,kit,deliverables:{pdf:true,kit:true,report:true,publication:true}});
  send(res,'campaign',{status:'completed',durationMs:Date.now()-started,successful:outputs.length,failed:0,campaignId});
  res.end();
}

// Gera um PDF textual válido no servidor. O conteúdo é simples de propósito para ser confiável em qualquer navegador.
function pdfEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ')}
function makePdf(text){
  const lines=[]; for(const raw of String(text).split(/\r?\n/)){const t=raw.trimEnd(); if(!t){lines.push('');continue} let rest=t; while(rest.length>96){let cut=rest.lastIndexOf(' ',96);if(cut<20)cut=96;lines.push(rest.slice(0,cut));rest=rest.slice(cut+1)} lines.push(rest)}
  const pages=[]; for(let i=0;i<lines.length;i+=48) pages.push(lines.slice(i,i+48)); if(!pages.length)pages.push(['MarketVerse AI']);
  const objects=[]; const add=x=>{objects.push(x);return objects.length};
  const catalog=add(''); const pagesObj=add(''); const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const pageIds=[];
  for(const pageLines of pages){let stream='BT /F1 9 Tf 45 800 Td 0 -14 Td '; for(const line of pageLines){stream+=`(${pdfEscape(line.slice(0,180))}) Tj 0 -14 Td `} stream+='ET'; const content=add(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`); pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`))}
  objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`; objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
  let out='%PDF-1.4\n'; const offsets=[0]; for(let i=0;i<objects.length;i++){offsets[i+1]=Buffer.byteLength(out,'binary');out+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`} const xref=Buffer.byteLength(out,'binary');out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out,'binary');
}

app.post('/api/campaign/pdf', (req,res)=>{try{const title=clean(req.body?.title||'Campanha MarketVerse AI');const report=clean(req.body?.report||req.body?.output||'Sem conteúdo.');const pdf=makePdf(`MARKETVERSE AI — ${title}\n\n${report}`);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="marketverse-${Date.now()}.pdf"`);res.send(pdf)}catch(e){console.error(e);res.status(500).json({error:'Não foi possível gerar o PDF.'})}});

app.get('/api/campaign/stream', async (req,res) => {
  const brief=String(req.query.brief||'').trim();
  res.setHeader('Content-Type','text/event-stream; charset=utf-8'); res.setHeader('Cache-Control','no-cache, no-transform'); res.setHeader('Connection','keep-alive'); res.flushHeaders?.();
  if(!brief){send(res,'error',{message:'Informe o briefing da campanha.'});return res.end();}
  if(!gemini){send(res,'error',{message:'GEMINI_API_KEY não configurada no servidor.'});return res.end();}
  try{await runCampaign(brief,res);}catch(error){console.error(error);send(res,'error',{message:friendlyError(error)});res.end();}
});

app.get('/api/health',(_req,res)=>res.json({ok:true,provider:'Gemini',geminiConfigured:Boolean(gemini),supabaseConfigured:Boolean(PERSIST_URL&&SUPABASE_KEY),model:MODEL,agents:agents.length,pipeline:'sequential-handoff',deliverables:['final_campaign','execution_report','campaign_kit','pdf']}));

const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`MarketVerse AI running on :${port} | pipeline=sequential-handoff | provider=Gemini`));