'use client';

import { AssistantRuntimeProvider, useAssistantRuntime, useAuiState } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { Thread } from '@/components/assistant-ui/thread';

function HeaderActions() {
  const runtime = useAssistantRuntime();
  const isEmpty = useAuiState((s) => s.thread.isEmpty);

  if (isEmpty) return null;

  return (
    <button
      type="button"
      onClick={() => runtime.threads.switchToNewThread()}
      className="min-h-9 rounded-full bg-[radial-gradient(ellipse_at_22%_20%,rgb(255_255_255_/_0.65)_0%,rgb(255_255_255_/_0.40)_70%)] backdrop-blur-xl px-4 py-1.5 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.45),0_2px_8px_rgb(20_30_50_/_0.10)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sky-mid"
    >
      New trip
    </button>
  );
}

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
          <HeaderActions />
        </header>
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
