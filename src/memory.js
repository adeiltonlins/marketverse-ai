const store = new Map();

export function createCampaign(id, briefing) {
  const campaign = { id, briefing, artifacts: [], events: [], createdAt: new Date().toISOString() };
  store.set(id, campaign);
  return campaign;
}

export function getCampaign(id) {
  return store.get(id) ?? null;
}

export function addArtifact(id, agentId, artifact) {
  const campaign = store.get(id);
  if (!campaign) throw new Error(`Campaign ${id} not found`);
  campaign.artifacts.push({ agentId, artifact, createdAt: new Date().toISOString() });
  return campaign;
}

export function addEvent(id, event) {
  const campaign = store.get(id);
  if (!campaign) throw new Error(`Campaign ${id} not found`);
  campaign.events.push({ ...event, createdAt: new Date().toISOString() });
  return campaign;
}
