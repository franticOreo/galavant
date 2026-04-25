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
      <main className="mx-auto flex h-dvh max-w-2xl flex-col">
        <header className="px-4 py-3 border-b border-neutral-200">
          <h1 className="text-lg font-medium tracking-tight">Galavant</h1>
        </header>
        <div className="flex-1 min-h-0">
          <Thread />
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
