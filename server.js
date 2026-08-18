import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

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

async function runCampaign(brief, res) {
  const results = [];
  send(res, 'campaign', { status: 'started', brief, model: MODEL, agents: agents.length });

  const runAgent = async ([id, name, role]) => {
    send(res, 'agent', { id, name, status: 'working', progress: 10, message: 'Recebeu a tarefa do Coordenador.' });
    try {
      const response = await openai.responses.create({
        model: MODEL,
        input: `${base(brief)}\n\nSUA FUNÇÃO: ${role}\n\nResponda como ${name}.`,
        max_output_tokens: 700
      });
      const output = response.output_text || '';
      const result = { id, name, output };
      results.push(result);
      send(res, 'agent', { id, name, status: 'completed', progress: 100, message: 'Entregou o relatório ao Coordenador.', preview: output.slice(0, 280) });
      return result;
    } catch (error) {
      send(res, 'agent', { id, name, status: 'error', progress: 100, message: 'Falha na execução deste agente.' });
      return { id, name, output: `Agente indisponível: ${error.message}` };
    }
  };

  send(res, 'log', { from: 'coordinator', message: 'Briefing recebido. Distribuindo 10 tarefas em paralelo.' });
  await Promise.all(agents.map(runAgent));

  send(res, 'log', { from: 'coordinator', message: 'Os 10 relatórios chegaram. Consolidando estratégia.' });
  const synthesisInput = results.map(r => `### ${r.name}\n${r.output}`).join('\n\n');
  const coordinator = await openai.responses.create({
    model: MODEL,
    input: `Você é o Coordenador do MarketVerse AI. Consolide o trabalho de 10 especialistas em um plano de campanha claro e executável. Preserve divergências importantes, elimine duplicações e destaque prioridades.\n\nBRIEFING:\n${brief}\n\nRELATÓRIOS:\n${synthesisInput}`,
    max_output_tokens: 1200
  });

  send(res, 'coordinator', { status: 'completed', output: coordinator.output_text || '' });
  send(res, 'campaign', { status: 'completed' });
  res.end();
}

app.get('/api/campaign/stream', async (req, res) => {
  const brief = String(req.query.brief || '').trim();
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!brief) {
    send(res, 'error', { message: 'Informe o briefing da campanha.' });
    return res.end();
  }
  if (!openai) {
    send(res, 'error', { message: 'OPENAI_API_KEY não configurada no servidor.' });
    return res.end();
  }

  try {
    await runCampaign(brief, res);
  } catch (error) {
    console.error(error);
    send(res, 'error', { message: 'Falha ao executar a equipe de agentes.' });
    res.end();
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, openaiConfigured: Boolean(openai), agents: agents.length }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`MarketVerse AI running on :${port}`));
