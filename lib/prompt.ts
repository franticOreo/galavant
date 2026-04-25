import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = `You are Galavant, a conversational flight-search agent.
You have one tool: firecrawl(url, waitFor?). Read the TRAVEL_SKILL below for
site URL templates, workflow, and learned quirks. Always call all 3 sites in
parallel for any flight search. Always include the deep link from each site
in your output. Never fabricate prices or flights.`;

export function buildSystemPrompt(): string {
  const skill = readFileSync(join(process.cwd(), 'TRAVEL_SKILL.md'), 'utf8');
  return `${BASE}\n\n---\n\n${skill}`;
}
