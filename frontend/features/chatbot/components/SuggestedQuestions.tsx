"use client";

interface SuggestedQuestionsProps {
  questions: { label: string; question: string }[];
  onPick: (question: string) => void;
  disabled: boolean;
  heading: string;
}

/**
 * Question buttons — the opening set, and the followups after each answer.
 *
 * These are the primary interface, not decoration. A blank text box is a poor
 * starting point for visitors with intellectual disabilities; a short list of
 * real questions is far easier to act on. They also make the no-Ollama fallback
 * work, because each button sends exact trigger text that matches lexically.
 */
export function SuggestedQuestions({
  questions,
  onPick,
  disabled,
  heading,
}: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-zinc-600">{heading}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {questions.map((item) => (
          <li key={item.question}>
            <button
              type="button"
              onClick={() => onPick(item.question)}
              disabled={disabled}
              className="w-full min-h-[2.75rem] rounded-lg border border-zinc-300 bg-white px-4 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
