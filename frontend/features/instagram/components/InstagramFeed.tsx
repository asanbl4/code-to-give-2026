import { fetchInstagramFeed } from "../api";
import { PostCard } from "./PostCard";

/**
 * Self-contained Instagram feed. Async Server Component: fetches on the server
 * and renders the grid. Drop `<InstagramFeed />` onto any page.
 *
 * Design is intentionally minimal for the MVP — this is the data pipe, not the
 * final look.
 */
export async function InstagramFeed({ limit = 12 }: { limit?: number }) {
  const result = await fetchInstagramFeed(limit);

  if (!result.ok) {
    return (
      <p className="rounded border border-red-300 bg-red-50 px-4 py-2 text-red-700">
        Could not load Instagram posts: {result.error}
      </p>
    );
  }

  const { feed } = result;

  if (feed.posts.length === 0) {
    return <p className="text-sm text-zinc-500">No posts yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {feed.source === "fixture" && (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Showing sample posts — no Instagram token is configured yet.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {feed.posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
