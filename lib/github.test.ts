import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { commitFile } from './github';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  process.env.GITHUB_TOKEN = 'ghp_test';
  process.env.GITHUB_REPO = 'franticOreo/galavant';
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('commitFile', () => {
  it('GETs current sha then PUTs new content with correct headers', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sha: 'abc123' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: { sha: 'def456' } }), { status: 200 }),
      );

    const r = await commitFile({
      path: 'TRAVEL_SKILL.md',
      content: '# new content',
      message: 'update skill',
      branch: 'main',
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.commitSha).toBe('def456');

    const [getUrl, getInit] = fetchMock.mock.calls[0];
    expect(getUrl).toContain('/repos/franticOreo/galavant/contents/TRAVEL_SKILL.md');
    expect((getInit as RequestInit).method ?? 'GET').toBe('GET');
    expect(((getInit as RequestInit).headers as Record<string, string>)['Authorization']).toBe(
      'Bearer ghp_test',
    );

    const [putUrl, putInit] = fetchMock.mock.calls[1];
    expect(putUrl).toContain('/repos/franticOreo/galavant/contents/TRAVEL_SKILL.md');
    expect((putInit as RequestInit).method).toBe('PUT');
    const body = JSON.parse((putInit as RequestInit).body as string);
    expect(body.message).toBe('update skill');
    expect(body.branch).toBe('main');
    expect(body.sha).toBe('abc123');
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe('# new content');
  });

  it('handles "file does not exist yet" (GET 404 → PUT without sha)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: { sha: 'new' } }), { status: 201 }),
      );

    const r = await commitFile({
      path: 'NEW.md',
      content: 'hi',
      message: 'create',
      branch: 'main',
    });
    expect(r.ok).toBe(true);
    const putBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(putBody.sha).toBeUndefined();
  });

  it('returns error on PUT failure', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'abc' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const r = await commitFile({
      path: 'x.md',
      content: 'y',
      message: 'm',
      branch: 'main',
    });
    expect(r.ok).toBe(false);
  });
});
