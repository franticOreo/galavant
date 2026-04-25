'use client';
import { useState } from 'react';

export function SkillEditor({ initial }: { initial: string }) {
  const [content, setContent] = useState(initial);
  const [msg, setMsg] = useState('feat(skill): edit TRAVEL_SKILL.md');
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setStatus('saving');
    setErr(null);
    const res = await fetch('/api/skill', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content, message: msg }),
    });
    if (res.ok) setStatus('ok');
    else {
      setStatus('err');
      setErr(await res.text());
    }
  }

  return (
    <>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="flex-1 rounded-md border p-3 font-mono text-sm bg-transparent"
      />
      <div className="flex gap-2 items-center">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="commit message"
          className="flex-1 rounded-md border px-3 py-2 bg-transparent"
        />
        <button
          onClick={save}
          disabled={status === 'saving' || !content.trim()}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save & commit'}
        </button>
      </div>
      {status === 'ok' && <p className="text-sm text-green-700">Committed.</p>}
      {status === 'err' && <p className="text-sm text-red-600">{err}</p>}
    </>
  );
}
