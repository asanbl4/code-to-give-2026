import { EventsTeaser } from "./events/events-teaser";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function fetchHello(): Promise<{ message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/hello`, { cache: "no-store" });
    if (!response.ok) {
      return { error: `${response.status} ${response.statusText}` };
    }
    return await response.json();
  } catch (cause) {
    return { error: `Could not reach the API at ${API_URL}. Is uvicorn running? (${cause})` };
  }
}

export default async function Home() {
  const { message, error } = await fetchHello();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f8fafc_100%)] py-10 sm:py-14">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Frontend
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Simple sign-up support for upcoming sessions
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            The homepage still checks the API connection first, then gives a quiet preview of the
            next sessions for people who want to explore what is coming up.
          </p>
        </div>

        <section className="max-w-2xl rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm shadow-emerald-100/60 ring-1 ring-emerald-950/5">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">
            API status
          </p>
          <p className="mt-3 text-sm text-slate-600">GET {API_URL}/api/hello</p>
          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </p>
          ) : (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm leading-6 text-emerald-800">
              {message}
            </p>
          )}
        </section>
      </section>

      <EventsTeaser />
    </main>
  );
}
