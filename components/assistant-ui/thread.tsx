import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import type { FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "9999px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-10 flex flex-col gap-y-8 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mt-auto flex flex-col gap-4 overflow-visible pb-4 md:pb-6">
            <ThreadScrollToBottom />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:border-border dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root my-auto flex grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center pb-12">
        <div className="aui-thread-welcome-message flex flex-col items-center text-center px-4">
          <h1
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-wordmark text-[clamp(44px,11vw,64px)] leading-[0.95] text-white duration-300 [text-shadow:0_2px_14px_rgb(0_0_0_/_0.22),0_0_50px_rgb(255_255_255_/_0.12)]"
          >
            Galavant
          </h1>
          <p
            className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-script text-[clamp(24px,5vw,32px)] font-bold text-accent-bright -rotate-[3deg] -mt-1 delay-100 duration-300 [text-shadow:0_0_8px_var(--accent-glow),0_1px_3px_rgb(15_25_45_/_0.25)]"
          >
            travel, lifted
          </p>
          <p className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both mt-7 text-sm text-white/85 delay-150 duration-300">
            Plan your trip. Skip the booking-site shuffle.
          </p>
        </div>
      </div>
      <ThreadStarterPrompts />
    </div>
  );
};

const STARTER_PROMPTS = [
  "2 weeks in Japan, under $3k",
  "Cheapest May flight NYC → Lisbon",
  "Solo trip, beach + hiking, October",
];

const ThreadStarterPrompts: FC = () => {
  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both delay-200 duration-300 flex w-full flex-wrap justify-center gap-2 px-4 pb-6">
      {STARTER_PROMPTS.map((prompt) => (
        <ThreadPrimitive.Suggestion
          key={prompt}
          prompt={prompt}
          method="replace"
          autoSend
          className="min-h-11 rounded-full bg-white/30 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sky-mid"
        >
          {prompt}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
        <div
          data-slot="aui_composer-shell"
          className="flex w-full items-end gap-2 rounded-tl-[28px] rounded-tr-[32px] rounded-br-[26px] rounded-bl-[30px] bg-[radial-gradient(ellipse_at_18%_20%,rgb(255_255_255_/_0.85)_0%,rgb(255_255_255_/_0.62)_70%)] backdrop-blur-2xl px-4 py-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.65),0_4px_16px_rgb(20_30_50_/_0.06),0_12px_36px_rgb(20_30_50_/_0.08)] transition-shadow focus-within:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.65),0_4px_16px_rgb(20_30_50_/_0.08),0_0_0_2px_rgb(93_213_204_/_0.35)]"
        >
          <ComposerPrimitive.Input
            placeholder="Where to?"
            className="aui-composer-input flex-1 max-h-32 min-h-11 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink outline-none placeholder:text-[var(--ink-muted)]"
            rows={1}
            autoFocus
            aria-label="Message input"
          />
          <ComposerAction />
        </div>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper flex items-center">
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            type="button"
            aria-label="Send message"
            className="aui-composer-send flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white/72 disabled:opacity-40"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            type="button"
            aria-label="Stop generating"
            className="aui-composer-cancel flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white"
          >
            <SquareIcon className="size-3 fill-current" />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root self-start max-w-[88%] mt-1 flex items-start gap-3 rounded-tl-[24px] rounded-tr-[28px] rounded-br-[18px] rounded-bl-[12px] bg-[radial-gradient(ellipse_at_18%_20%,rgb(255_232_215_/_0.85)_0%,rgb(255_220_205_/_0.55)_70%)] backdrop-blur-xl px-4 py-3 text-[14px] leading-[1.5] text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.55),0_2px_12px_rgb(180_100_50_/_0.10)]">
        <span aria-hidden className="mt-1 inline-block size-2 shrink-0 rounded-full bg-warn" />
        <div className="flex-1 min-w-0">
          <span className="block font-semibold">Couldn't reach the model.</span>
          <span className="mt-0.5 block text-ink/65 text-[13px]">
            Something went wrong upstream. Try again, or rephrase your trip.
          </span>
          <ActionBarPrimitive.Reload asChild>
            <button
              type="button"
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[12px] font-medium text-white transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <RefreshCwIcon className="size-3" />
              Try again
            </button>
          </ActionBarPrimitive.Reload>
        </div>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  // reserves space for action bar and compensates with `-mb` for consistent msg spacing
  // keeps hovered action bar from shifting layout (autohide doesn't support absolute positioning well)
  // for pt-[n] use -mb-[n + 6] & min-h-[n + 6] to preserve compensation
  const ACTION_BAR_PT = "pt-1.5";
  const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 relative animate-in duration-150"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="wrap-break-word self-start max-w-[88%] rounded-tl-[28px] rounded-tr-[36px] rounded-br-[22px] rounded-bl-[14px] bg-[radial-gradient(ellipse_at_22%_18%,rgb(255_255_255_/_0.65)_0%,rgb(255_255_255_/_0.42)_70%)] backdrop-blur-2xl px-5 py-4 text-[15px] leading-[1.6] tracking-[-0.005em] text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.55),inset_0_-1px_0_rgb(15_25_45_/_0.04),0_2px_8px_rgb(20_30_50_/_0.04),0_12px_32px_rgb(20_30_50_/_0.08)] [&_a]:text-accent-deep [&_a]:no-underline [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-accent-deep/40 [&_strong]:text-ink [&_strong]:font-semibold [&_ol]:my-2 [&_ul]:my-2 [&_li]:my-1 [&_p+p]:mt-3 empty:hidden"
      >
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Reasoning,
            ReasoningGroup,
            tools: { Fallback: () => null },
          }}
        />
      </div>

      <MessageError />

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("ms-2 flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ms-1 flex gap-1 text-muted-foreground"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.FeedbackPositive asChild>
        <TooltipIconButton tooltip="Good response">
          <ThumbsUpIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackPositive>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <TooltipIconButton tooltip="Bad response">
          <ThumbsDownIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackNegative>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 grid animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content wrap-break-word peer rounded-tl-[32px] rounded-tr-[24px] rounded-br-[16px] rounded-bl-[28px] bg-ink px-5 py-3 text-[15px] leading-[1.5] tracking-[-0.005em] text-white shadow-[0_1px_12px_rgba(20,30,50,0.10)] empty:hidden">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root ms-auto flex w-full max-w-[88%] flex-col rounded-tl-[32px] rounded-tr-[24px] rounded-br-[16px] rounded-bl-[28px] bg-ink shadow-[0_1px_12px_rgb(20_30_50_/_0.10)]">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-[15px] text-white outline-none placeholder:text-white/45"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root -ms-2 me-2 inline-flex items-center text-muted-foreground text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
