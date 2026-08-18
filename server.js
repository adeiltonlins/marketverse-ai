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

app.post('/api/campaign', async (req, res) => {
  const brief = String(req.body?.brief || '').trim();
  if (!brief) return res.status(400).json({ error: 'Informe o briefing da campanha.' });
  if (!openai) return res.status(503).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });

  try {
    const results = await Promise.all(agents.map(async ([id, name, role]) => {
      const response = await openai.responses.create({
        model: MODEL,
        input: `${base(brief)}\n\nSUA FUNÇÃO: ${role}\n\nResponda como ${name}.`,
        max_output_tokens: 700
      });
      return { id, name, output: response.output_text || '' };
    }));

    const synthesisInput = results.map(r => `### ${r.name}\n${r.output}`).join('\n\n');
    const coordinator = await openai.responses.create({
      model: MODEL,
      input: `Você é o Coordenador do MarketVerse AI. Consolide o trabalho de 10 especialistas em um plano de campanha claro e executável. Preserve divergências importantes, elimine duplicações e destaque prioridades.\n\nBRIEFING:\n${brief}\n\nRELATÓRIOS:\n${synthesisInput}`,
      max_output_tokens: 1200
    });

    res.json({ brief, model: MODEL, agents: results, coordinator: coordinator.output_text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao executar a equipe de agentes.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, openaiConfigured: Boolean(openai), agents: agents.length }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`MarketVerse AI running on :${port}`));
