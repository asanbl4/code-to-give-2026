import { AssistantFace } from "./AssistantFace";

interface ChatAvatarProps {
  /** 8 = beside a message, 10 = in the panel header. */
  size?: 8 | 10;
}

/**
 * The assistant's avatar: its face on a light disc.
 *
 * White rather than tinted, with a ring: the message bubbles beside it are
 * `bg-zinc-100`, and an avatar in the same grey would dissolve into them.
 */
export function ChatAvatar({ size = 8 }: ChatAvatarProps) {
  const box = size === 10 ? "h-10 w-10" : "h-8 w-8";
  const face = size === 10 ? "h-7 w-7" : "h-6 w-6";

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 ring-1 ring-zinc-300`}
    >
      <AssistantFace className={face} />
    </div>
  );
}
