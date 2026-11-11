// Defines the approved dictionary, explicit variants, categories, and weights.
// Makes every counted phrase explainable and keeps normal product terms low weight.
import { z } from 'zod';

export const categorySchema = z.enum(['AI hype', 'Corporate fluff', 'Big claims']);
export type Category = z.infer<typeof categorySchema>;
export const categories = categorySchema.options;
export const buzzwordSchema = z.object({
  id: z.string(), phrase: z.string(), weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  category: categorySchema, variants: z.array(z.string()),
});
export type Buzzword = z.infer<typeof buzzwordSchema>;

function term(phrase: string, weight: Buzzword['weight'], category: Category, variants: string[] = []): Buzzword {
  return { id: phrase.toLowerCase().replace(/\s+/g, '-'), phrase, weight, category, variants: [phrase, ...variants] };
}

export const buzzwords: readonly Buzzword[] = [
  term('AI-powered', 2, 'AI hype', ['A.I.-powered']),
  term('AI-native', 3, 'AI hype', ['A.I.-native']),
  term('agentic', 1, 'AI hype', ['agentically']),
  term('copilot', 1, 'AI hype', ['copilots', 'co-pilot', 'co-pilots']),
  term('AI-first', 3, 'AI hype', ['A.I.-first']),
  term('AI-driven', 2, 'AI hype', ['A.I.-driven']),
  term('AI agent', 1, 'AI hype', ['AI agents']),
  term('autonomous agent', 3, 'AI hype', ['autonomous agents']),
  term('multi-agent', 1, 'AI hype', ['multiagent']),
  term('generative AI', 2, 'AI hype', ['generative A.I.']),
  term('agentic workflow', 3, 'AI hype', ['agentic workflows']),
  term('intelligent automation', 2, 'AI hype'),
  term('AI assistant', 2, 'AI hype', ['AI assistants']),
  term('superintelligence', 3, 'AI hype', ['superintelligent']),
  term('human-level', 3, 'AI hype'),
  term('seamless', 1, 'Corporate fluff', ['seamlessly']),
  term('robust', 1, 'Corporate fluff', ['robustly']),
  term('unlock', 1, 'Corporate fluff', ['unlocks', 'unlocked', 'unlocking']),
  term('leverage', 1, 'Corporate fluff', ['leverages', 'leveraged', 'leveraging']),
  term('empower', 1, 'Corporate fluff', ['empowers', 'empowered', 'empowering']),
  term('supercharge', 2, 'Corporate fluff', ['supercharges', 'supercharged', 'supercharging']),
  term('game-changing', 3, 'Corporate fluff', ['game-changer', 'game-changers']),
  term('streamline', 1, 'Corporate fluff', ['streamlines', 'streamlined', 'streamlining']),
  term('frictionless', 2, 'Corporate fluff', ['frictionlessly']),
  term('end-to-end', 1, 'Corporate fluff'),
  term('all-in-one', 1, 'Corporate fluff'),
  term('scalable', 1, 'Corporate fluff', ['scalability']),
  term('cutting-edge', 2, 'Corporate fluff'),
  term('next-generation', 2, 'Corporate fluff', ['next-gen']),
  term('best-in-class', 3, 'Corporate fluff'),
  term('synergy', 2, 'Corporate fluff', ['synergies', 'synergistic']),
  term('holistic', 1, 'Corporate fluff', ['holistically']),
  term('ecosystem', 1, 'Corporate fluff', ['ecosystems']),
  term('mission-critical', 2, 'Corporate fluff'),
  term('turnkey', 1, 'Corporate fluff', ['turn-key']),
  term('10x', 3, 'Big claims', ['10×', '10 x', '10-x']),
  term('revolutionize', 3, 'Big claims', ['revolutionizes', 'revolutionized', 'revolutionizing', 'revolutionise', 'revolutionises', 'revolutionised', 'revolutionising']),
  term('the future of', 3, 'Big claims'),
  term('first-ever', 3, 'Big claims'),
  term('world-class', 3, 'Big claims'),
  term('industry-leading', 3, 'Big claims'),
  term('groundbreaking', 3, 'Big claims', ['ground-breaking']),
  term('unprecedented', 3, 'Big claims'),
  term('transformative', 2, 'Big claims', ['transformatively']),
  term('limitless', 2, 'Big claims'),
  term('exponential', 2, 'Big claims', ['exponentially']),
  term('paradigm shift', 3, 'Big claims', ['paradigm shifts', 'paradigm-shifting']),
  term('disrupt', 2, 'Big claims', ['disrupts', 'disrupted', 'disrupting', 'disruptive', 'disruption', 'disruptions']),
  term('unmatched', 2, 'Big claims'),
  term('unparalleled', 3, 'Big claims'),
];
