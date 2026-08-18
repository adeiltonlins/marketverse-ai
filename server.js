import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MAX_CONCURRENT = Math.max(1, Number(process.env.MAX_CONCURRENT_AGENTS || 3));
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

const esc = s => String(s ?? '');
const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

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

async function askGemini(prompt) {
  const response = await gemini.models.generateContent({ model:MODEL, contents:prompt, config:{maxOutputTokens:1100, temperature:0.7} });
  return response.text || 'Sem conteúdo textual.';
}

async function runAgent(res, campaignId, id, name, role, briefing, context, index, total) {
  const task = `Você é ${name}, especialista da MarketVerse AI. Trabalhe somente dentro do seu papel.\n\nBRIEFING ORIGINAL:\n${briefing}\n\nCONTEXTO ENTREGUE PELOS AGENTES ANTERIORES:\n${context || 'Nenhum — você é o primeiro agente desta etapa.'}\n\nSUA FUNÇÃO:\n${role}\n\nEntregue material acionável para o próximo agente. Não invente dados; sinalize hipóteses. Termine com uma seção "ENTREGA PARA O PRÓXIMO AGENTE".`;
  send(res,'agent',{id,name,status:'working',progress:15,message:`Recebeu a tarefa ${index}/${total} e está trabalhando.`});
  if (campaignId) await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'working',progress:15,task:role});
  try {
    const output = await askGemini(task);
    if (campaignId) {
      await persist('agent_run',{campaign_id:campaignId,agent_id:id,status:'completed',progress:100,task:role,output:{text:output}});
      await persist('deliverable',{campaign_id:campaignId,agent_id:id,type:'agent_report',title:`${name} — entrega`,content:{text:output}});
      await persist('event',{campaign_id:campaignId,agent_id:id,event_type:'agent.completed',message:`${name} entregou para a próxima etapa.`});
    }
    send(res,'agent',{id,name,status:'completed',progress:100,message:'Entrega pronta. Enviando para a próxima estação.',preview:output.slice(0,360)});
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
  const campaignName = brief.length > 70 ? `${brief.slice(0,67)}...` : brief;
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
    outputs.push({id,name,output});
    context = `${context}\n\n### ${name} — ENTREGA RECEBIDA\n${output}`.slice(-24000);
    send(res,'handoff',{from:id,to:agents[i+1]?.[0] || 'coordinator',message:`${name} entregou o pacote para ${agents[i+1]?.[1] || 'Coordenador'}.`});
  }

  send(res,'log',{from:'coordinator',message:'Todas as estações concluíram. O Coordenador está transformando as entregas em um pacote comercial executável.'});
  const synthesis = await askGemini(`Você é o Coordenador da MarketVerse AI. Crie a ENTREGA FINAL de uma campanha a partir do briefing e das entregas encadeadas abaixo.\n\nBRIEFING:\n${brief}\n\nENTREGAS:\n${context}\n\nEstruture exatamente nestas áreas: RESUMO EXECUTIVO; OBJETIVO; PÚBLICO; OFERTA E POSICIONAMENTO; PLANO DE CONTEÚDO; CRIATIVOS E ROTEIROS; COPYS; MÍDIA PAGA; SEO LOCAL; CRM/WHATSAPP; TRACKING E KPIs; CRONOGRAMA DE EXECUÇÃO; CHECKLIST DE ATIVOS.\n\nNo final inclua PROJEÇÕES, claramente marcadas como hipóteses/metas e nunca como resultados reais. Gere recomendações práticas.`);

  if (campaignId) {
    await persist('deliverable',{campaign_id:campaignId,agent_id:'coordinator',type:'final_campaign',title:'Pacote final da campanha',content:{text:synthesis,agents:outputs.map(x=>({id:x.id,name:x.name}))}});
    await persist('event',{campaign_id:campaignId,event_type:'campaign.completed',message:'Coordenador finalizou o pacote executável.'});
    await persist('complete_campaign',{campaign_id:campaignId,status:'completed'});
  }
  send(res,'coordinator',{status:'completed',output:synthesis,deliverables:{pdf:true,kit:true,publication:true}});
  send(res,'campaign',{status:'completed',durationMs:Date.now()-started,successful:outputs.length,failed:0,campaignId});
  res.end();
}

app.get('/api/campaign/stream', async (req,res) => {
  const brief=String(req.query.brief||'').trim();
  res.setHeader('Content-Type','text/event-stream; charset=utf-8'); res.setHeader('Cache-Control','no-cache, no-transform'); res.setHeader('Connection','keep-alive'); res.flushHeaders?.();
  if(!brief){send(res,'error',{message:'Informe o briefing da campanha.'});return res.end();}
  if(!gemini){send(res,'error',{message:'GEMINI_API_KEY não configurada no servidor.'});return res.end();}
  try{await runCampaign(brief,res);}catch(error){console.error(error);send(res,'error',{message:friendlyError(error)});res.end();}
});

app.get('/api/health',(_req,res)=>res.json({ok:true,provider:'Gemini',geminiConfigured:Boolean(gemini),supabaseConfigured:Boolean(PERSIST_URL&&SUPABASE_KEY),model:MODEL,agents:agents.length,pipeline:'sequential-handoff'}));

const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log(`MarketVerse AI running on :${port} | pipeline=sequential-handoff | provider=Gemini`));