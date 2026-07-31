import { CommunityGoalWidget } from "./homepage/community-goal-widget";

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
    <>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 pb-32 font-sans sm:pb-8">
        <h1 className="text-2xl font-semibold">Frontend</h1>
        <p className="text-sm text-zinc-500">GET {API_URL}/api/hello</p>
        {error ? (
          <p className="rounded border border-red-300 bg-red-50 px-4 py-2 text-red-700">
            {error}
          </p>
        ) : (
          <p className="rounded border border-green-300 bg-green-50 px-4 py-2 text-green-800">
            {message}
          </p>
        )}
      </main>
      <CommunityGoalWidget />
    </>
  );
}
