# Task 1 Report: Add event data, signup types, and calendar helpers

## Summary

Implemented the foundational calendar sign-up modules in `frontend/app/events/`:

- `events.types.ts` defines the shared event and signup types.
- `events.data.ts` exports three mock sessions for the upcoming events experience.
- `calendar.ts` provides pure helpers for Google Calendar URLs and `.ics` file generation.
- `signup.ts` exposes a stable async mock submission adapter.

## Implementation Notes

- The event sessions are lightweight static data and stay framework-agnostic.
- Calendar timestamps are normalized from the session ISO strings into UTC `YYYYMMDDTHHMMSSZ` format for both Google Calendar and ICS output.
- ICS text fields are escaped for commas, semicolons, backslashes, and line breaks.
- The signup adapter preserves the requested mock async interface and returns a deterministic confirmation ID based on the session ID.

## Verification

- Ran `npx tsc --noEmit` in `frontend/`.
- Result: pass, with no TypeScript errors.

## Scope

- No other areas of the app were modified.
- Existing untracked work in the repository was left untouched.
