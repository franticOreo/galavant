'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.push('/');
    else setErr(res.status === 401 ? 'Wrong password.' : 'Login failed.');
  }

  return (
    <main className="relative z-10 min-h-dvh flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md flex flex-col items-center gap-5 rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-assistant)] p-8 backdrop-blur-2xl shadow-[0_8px_30px_rgba(20,30,50,0.08)]"
      >
        <div className="flex flex-col items-center text-center">
          <h1 className="font-wordmark text-[clamp(36px,9vw,44px)] leading-[0.95] text-white [text-shadow:0_2px_14px_rgb(0_0_0_/_0.22)]">
            Galavant
          </h1>
          <p className="font-script text-[clamp(18px,5vw,22px)] font-bold text-accent-bright -rotate-[3deg] -mt-1 [text-shadow:0_0_6px_var(--accent-glow),0_1px_2px_rgb(15_25_45_/_0.25)]">
            travel, lifted
          </p>
        </div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full min-h-11 rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-composer)] px-5 py-3 text-[15px] text-ink placeholder:text-[var(--ink-muted)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white/30"
        />
        <button
          disabled={loading || !password}
          className="w-full min-h-11 rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-white transition-transform disabled:opacity-50 hover:not-disabled:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white/30"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
        {err && (
          <p
            role="alert"
            className="flex items-center gap-2 self-stretch rounded-full bg-[rgb(255_232_215_/_0.65)] backdrop-blur-md px-4 py-2 text-[13px] font-medium text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.45)]"
          >
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-warn" />
            {err}
          </p>
        )}
      </form>
    </main>
  );
}
