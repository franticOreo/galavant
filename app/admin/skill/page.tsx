import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SkillEditor } from './editor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function SkillPage() {
  const initial = readFileSync(join(process.cwd(), 'TRAVEL_SKILL.md'), 'utf8');
  return (
    <main className="mx-auto max-w-3xl p-4 flex flex-col gap-3 h-dvh">
      <h1 className="text-lg font-medium">Edit TRAVEL_SKILL.md</h1>
      <p className="text-sm text-neutral-500">
        Save commits to GitHub on the <code>main</code> branch. Vercel auto-redeploys.
      </p>
      <SkillEditor initial={initial} />
    </main>
  );
}
