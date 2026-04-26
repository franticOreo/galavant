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
          <span className="font-wordmark text-xl tracking-normal text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
            Galavant
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-white/40 bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/30"
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
