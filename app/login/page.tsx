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
        className="w-full max-w-md flex flex-col items-center gap-5 rounded-3xl border border-white/50 bg-white/32 p-8 backdrop-blur-2xl shadow-[0_8px_30px_rgba(20,30,50,0.08)]"
      >
        <div className="flex flex-col items-center text-center">
          <h1 className="font-wordmark text-[44px] leading-[0.95] text-white [text-shadow:0_2px_14px_rgb(0_0_0_/_0.22)]">
            Galavant
          </h1>
          <p className="font-script text-[22px] font-bold text-[#ff7a9e] -rotate-[4deg] -mt-1 [text-shadow:0_0_6px_rgb(255_122_158_/_0.65)]">
            travel, lifted
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-full border border-white/60 bg-white/72 px-5 py-3 text-[15px] text-[#1a2540] placeholder:text-[#1a2540]/45 backdrop-blur-xl outline-none focus:ring-2 focus:ring-[#ff7a9e]/30"
        />
        <button
          disabled={loading || !password}
          className="w-full rounded-full bg-[#1a2540] px-5 py-3 text-[15px] font-medium text-white transition-transform disabled:opacity-50 hover:not-disabled:scale-[1.02]"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
        {err && <p className="text-sm text-red-200">{err}</p>}
      </form>
    </main>
  );
}
