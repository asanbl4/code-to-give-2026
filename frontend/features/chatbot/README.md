# Chatbot feature (frontend)

The visitor-facing assistant. Talks only to our own backend (`POST /api/chat`),
which talks to a model running on the same machine.

## Use it

Render it once, anywhere — it is fixed-position:

    import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";

    <ChatLauncher />;

Give the page a bottom padding (`pb-28`) so the launcher never permanently
covers content.

## The accessibility contract

Do not undo these without reading `local/CONTEXT.md` §1 first.

- The launcher shows **text**, never a bare icon (#4).
- The panel is **full-screen below `37.5em`** and floating above it. The `em`
  breakpoint is deliberate: it covers both a small phone and a desktop at 200%
  zoom, which a `px` breakpoint does not.
- **Escape closes and returns focus to the launcher.**
- Answers render **complete, once**, into a single `aria-live="polite"` region.
  This is why tokens are not streamed — a mutating live region gets re-announced.
- **Nothing animates**, so `prefers-reduced-motion` needs no special case (#2).
- Locale and Easy Read are **inherited from `<html>`** (`lang`,
  `data-easy-read`), which the accessibility toolbar owns. The panel does not
  have its own language switch.

## Files

| File | Role |
|---|---|
| `types.ts` | Mirror of `backend/app/features/chatbot/models.py`. |
| `api.ts` | `postQuestion()`. Runs in the browser — CORS applies. |
| `components/ChatLauncher.tsx` | Trigger, state, and all UI strings. |
| `components/ChatPanel.tsx` | Shell: focus, Escape, breakpoint. |
| `components/ChatTranscript.tsx` | Messages and the live region. |
| `components/SuggestedQuestions.tsx` | Opening questions and followups. |

## Note

Suggested-question buttons send **exact trigger text** from the backend corpus.
That is what lets them keep working when Ollama is not running, since the
lexical fallback matches them at 1.0. If you reword a button, reword the trigger
in `backend/app/features/chatbot/knowledge/*.yaml` too.
