'use client';

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { Thread } from '@/components/assistant-ui/thread';

export default function Home() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: '/api/chat' }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="relative z-10 mx-auto flex h-dvh max-w-2xl flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <span className="font-wordmark text-xl text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
            Galavant
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/40 bg-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sky-mid"
            >
              Sign in
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
