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

const agents = [
  ['strategy', 'Estratégia', 'Defina objetivo, posicionamento, público e direção estratégica.'],
  ['research', 'Pesquisa', 'Analise mercado, concorrentes, tendências e oportunidades.'],
  ['copy', 'Copywriter', 'Crie mensagens, headlines, anúncios e CTAs orientados à conversão.'],
  ['creative', 'Criativo', 'Proponha conceitos visuais e formatos de criativos para a campanha.'],
  ['social', 'Social Media', 'Monte ideias e calendário de conteúdo para redes sociais.'],
  ['seo', 'SEO', 'Sugira palavras-chave, temas e oportunidades de aquisição orgânica.'],
  ['performance', 'Performance', 'Proponha estrutura de mídia paga, testes e KPIs.'],
  ['analytics', 'Analytics', 'Defina métricas, eventos e critérios para avaliar sucesso.'],
  ['crm', 'CRM', 'Crie uma jornada de leads e pontos de contato de relacionamento.'],
  ['growth', 'Growth', 'Proponha experimentos de crescimento priorizados por impacto e esforço.']
];

const base = (brief) => `Você é um especialista da equipe MarketVerse AI. Trabalhe somente dentro do seu papel.\n\nBRIEFING DA CAMPANHA:\n${brief}\n\nEntregue uma resposta objetiva, acionável e estruturada. Não invente dados que não estejam no briefing. Quando faltar informação, sinalize a hipótese.`;
const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

function friendlyError(error) {
  const status = error?.status || error?.error?.code;
  const message = String(error?.message || '').toLowerCase();
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) return 'A API Gemini atingiu a quota ou limite de taxa. Verifique o uso/billing da chave no Google AI Studio e tente novamente.';
  if (status === 401 || status === 403 || message.includes('api key')) return 'A chave Gemini foi recusada. Verifique GEMINI_API_KEY no Render e as restrições da chave.';
  if (status === 404 || message.includes('not found')) return `O modelo ${MODEL} não está disponível para esta chave/projeto.`;
  return 'O agente encontrou um erro ao chamar o Gemini. Tente novamente.';
}

async function askGemini(prompt) {
  const response = await gemini.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { maxOutputTokens: 900, temperature: 0.7 }
  });
  return response.text || 'O agente terminou sem conteúdo textual.';
}

async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

async function runCampaign(brief, res) {
  const started = Date.now();
  send(res, 'campaign', { status: 'started', brief, model: MODEL, provider: 'Gemini', agents: agents.length });
  send(res, 'log', { from: 'coordinator', message: `Briefing recebido. Abrindo ${agents.length} estações; até ${MAX_CONCURRENT} chamadas Gemini são processadas por vez.` });

  const results = await mapWithConcurrency(agents, async ([id, name, role]) => {
    send(res, 'agent', { id, name, status: 'working', progress: 15, message: 'Recebeu a tarefa do Coordenador.' });
    try {
      const output = await askGemini(`${base(brief)}\n\nSUA FUNÇÃO: ${role}\n\nResponda como ${name}.`);
      send(res, 'agent', { id, name, status: 'completed', progress: 100, message: 'Entregou o relatório ao Coordenador.', preview: output.slice(0, 420) });
      return { id, name, output, ok: true };
    } catch (error) {
      console.error(`Agent ${id} failed:`, error?.status, error?.message);
      const message = friendlyError(error);
      send(res, 'agent', { id, name, status: 'error', progress: 100, message, errorCode: error?.code || String(error?.status || 'agent_error') });
      return { id, name, output: `[${name} indisponível] ${message}`, ok: false };
    }
  }, MAX_CONCURRENT);

  const successful = results.filter(r => r.ok);
  const failed = results.length - successful.length;
  send(res, 'log', { from: 'coordinator', message: `${successful.length}/10 agentes concluíram. ${failed ? `${failed} falharam; ` : ''}Consolidando o que foi produzido.` });

  if (!successful.length) {
    send(res, 'coordinator', { status: 'error', output: `Nenhum agente conseguiu executar. ${friendlyError({ status: 429, message: 'quota' })}` });
    send(res, 'campaign', { status: 'failed', durationMs: Date.now() - started });
    return res.end();
  }

  try {
    const synthesisInput = successful.map(r => `### ${r.name}\n${r.output}`).join('\n\n');
    const output = await askGemini(`Você é o Coordenador do MarketVerse AI. Consolide o trabalho dos especialistas em um plano de campanha claro e executável. Preserve divergências importantes, elimine duplicações e destaque prioridades.\n\nBRIEFING:\n${brief}\n\nRELATÓRIOS:\n${synthesisInput}`);
    send(res, 'coordinator', { status: 'completed', output });
    send(res, 'campaign', { status: 'completed', durationMs: Date.now() - started, successful, failed });
  } catch (error) {
    console.error('Coordinator failed:', error?.status, error?.message);
    send(res, 'coordinator', { status: 'error', output: `Os agentes produziram resultados, mas o Coordenador não conseguiu consolidá-los. ${friendlyError(error)}` });
    send(res, 'campaign', { status: 'failed', durationMs: Date.now() - started, successful, failed });
  }
  res.end();
}

app.get('/api/campaign/stream', async (req, res) => {
  const brief = String(req.query.brief || '').trim();
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  if (!brief) { send(res, 'error', { message: 'Informe o briefing da campanha.' }); return res.end(); }
  if (!gemini) { send(res, 'error', { message: 'GEMINI_API_KEY não configurada no servidor.' }); return res.end(); }
  try { await runCampaign(brief, res); }
  catch (error) { console.error(error); send(res, 'error', { message: friendlyError(error) }); res.end(); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'Gemini', geminiConfigured: Boolean(gemini), model: MODEL, maxConcurrentAgents: MAX_CONCURRENT, agents: agents.length }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`MarketVerse AI running on :${port} | provider=Gemini | configured=${Boolean(gemini)}`));
