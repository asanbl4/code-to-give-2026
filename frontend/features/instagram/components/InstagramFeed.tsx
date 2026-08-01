import { fetchInstagramFeed } from "../api";
import { PostCard } from "./PostCard";

/**
 * Self-contained Instagram feed. Async Server Component: fetches on the server
 * and renders the grid. Drop `<InstagramFeed />` onto any page.
 */
export async function InstagramFeed({ limit = 12 }: { limit?: number }) {
  const result = await fetchInstagramFeed(limit);

  if (!result.ok) {
    return (
      <p className="rounded-card bg-danger-soft px-4 py-3 font-bold text-danger">
        Could not load Instagram posts: {result.error}
      </p>
    );
  }

  const { feed } = result;

  if (feed.posts.length === 0) {
    return <p className="text-ink-soft">No posts yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {feed.source === "fixture" && (
        <p className="rounded-card bg-highlight-soft px-4 py-3 text-ink">
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
