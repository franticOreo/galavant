type Args = {
  path: string;
  content: string;
  message: string;
  branch: string;
};

type Result = { ok: true; commitSha: string } | { ok: false; error: string };

const API = 'https://api.github.com';

function repoUrl(): string {
  const repo = process.env.GITHUB_REPO;
  if (!repo) throw new Error('GITHUB_REPO not set');
  return `${API}/repos/${repo}/contents`;
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function commitFile({ path, content, message, branch }: Args): Promise<Result> {
  const fileUrl = `${repoUrl()}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;

  const getRes = await fetch(`${fileUrl}?ref=${encodeURIComponent(branch)}`, {
    headers: authHeaders(),
  });
  let sha: string | undefined;
  if (getRes.status === 200) {
    const json = (await getRes.json()) as { sha?: string };
    sha = json.sha;
  } else if (getRes.status !== 404) {
    return { ok: false, error: `github GET ${getRes.status}` };
  }

  const putRes = await fetch(fileUrl, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      branch,
      content: Buffer.from(content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    return { ok: false, error: `github PUT ${putRes.status}: ${text.slice(0, 200)}` };
  }

  const json = (await putRes.json()) as { commit?: { sha?: string } };
  return { ok: true, commitSha: json.commit?.sha ?? '' };
}
