import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/github', () => ({
  commitFile: vi.fn(async () => ({ ok: true, commitSha: 'sha123' })),
}));

import { POST } from './route';
import { commitFile } from '@/lib/github';

beforeEach(() => {
  process.env.GITHUB_REPO = 'franticOreo/galavant';
  (commitFile as unknown as { mockClear: () => void }).mockClear();
});

const req = (body: unknown) =>
  new Request('http://localhost/api/skill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/skill', () => {
  it('commits content to TRAVEL_SKILL.md', async () => {
    const res = await POST(req({ content: '# new', message: 'tweak' }));
    expect(res.status).toBe(200);
    expect(commitFile).toHaveBeenCalledWith({
      path: 'TRAVEL_SKILL.md',
      content: '# new',
      message: 'tweak',
      branch: 'main',
    });
  });

  it('uses default commit message when missing', async () => {
    await POST(req({ content: '# new' }));
    const call = (commitFile as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as {
      message: string;
    };
    expect(call.message).toMatch(/skill/i);
  });

  it('400 on missing content', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it('502 when commitFile errors', async () => {
    (commitFile as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce({
      ok: false,
      error: 'boom',
    });
    const res = await POST(req({ content: 'x' }));
    expect(res.status).toBe(502);
  });
});
