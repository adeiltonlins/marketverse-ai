import { AGENTS } from './agent-registry.js';
import { createCampaign, addEvent, addArtifact } from './memory.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * MVP orchestrator. The browser demo uses this as a deterministic simulation.
 * The provider/model adapter will be injected later, so agent execution stays
 * independent from the UI and from any specific AI vendor.
 */
export async function runCampaign({ id = crypto.randomUUID(), briefing, onEvent = () => {} }) {
  const campaign = createCampaign(id, briefing);
  const emit = (event) => {
    addEvent(id, event);
    onEvent(event);
  };

  emit({ type: 'campaign.started', agentId: 'coordinator', message: 'Briefing recebido. Distribuindo tarefas.' });

  const results = await Promise.all(AGENTS.map(async (agent, index) => {
    emit({ type: 'agent.started', agentId: agent.id, message: `Tarefa atribuída: ${agent.role}` });
    await sleep(250 + (index % 4) * 120);
    const artifact = {
      title: `${agent.name}: primeira entrega`,
      status: 'draft',
      briefing,
      note: 'Placeholder do MVP — será substituído pelo executor de IA.'
    };
    addArtifact(id, agent.id, artifact);
    emit({ type: 'agent.completed', agentId: agent.id, message: 'Entrega registrada no contexto compartilhado.' });
    return { agentId: agent.id, artifact };
  }));

  emit({ type: 'campaign.completed', agentId: 'coordinator', message: 'Resultados consolidados. Pronto para revisão.' });
  return { ...campaign, results };
}
