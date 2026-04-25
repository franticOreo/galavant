import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSystemPrompt } from './prompt';

describe('buildSystemPrompt', () => {
  it('includes the base instructions and the skill file content', () => {
    const p = buildSystemPrompt();
    expect(p).toContain('Galavant');
    expect(p).toContain('firecrawl');
    expect(p).toContain('Travel');
    expect(p).toContain('Skill');
  });

  it('puts a separator between base and skill', () => {
    const p = buildSystemPrompt();
    expect(p).toMatch(/---\s*\n\n#/);
  });
});
