import { InstagramFeed } from "./InstagramFeed";

interface InstagramSectionProps {
  /** Section heading text. */
  title?: string;
  /** Optional line under the heading. */
  subtitle?: string;
  /** How many posts to show. */
  limit?: number;
  /** If set, renders a "See more on Instagram" link (e.g. the profile URL). */
  profileUrl?: string;
  /** Heading level so the section fits the host page's outline. Default 2. */
  headingLevel?: 1 | 2 | 3;
  /** Extra classes for the outer <section> (spacing, background, etc.). */
  className?: string;
  /** Override the heading id — only needed if two sections share a title on one page. */
  id?: string;
}

/**
 * Drop-in Instagram section. Self-contained: heading, container, and the feed
 * grid. Insert it anywhere:
 *
 *   <InstagramSection title="Latest from Instagram" limit={6} />
 *
 * It's an async-friendly Server Component (the feed inside fetches on the
 * server), so it works directly inside any page or layout with no extra wiring.
 */
export function InstagramSection({
  title = "Latest from Instagram",
  subtitle,
  limit = 12,
  profileUrl,
  headingLevel = 2,
  className = "",
  id,
}: InstagramSectionProps) {
  // Deterministic heading id derived from the title (pure — no random in render).
  // Pass `id` explicitly if two sections ever share a title on the same page.
  const headingId =
    id ?? `ig-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";

  return (
    <section aria-labelledby={headingId} className={`w-full py-12 ${className}`}>
      <div className="mx-auto w-full max-w-5xl rounded-xl bg-zinc-100 p-6 sm:p-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <Heading id={headingId} className="text-2xl font-semibold text-zinc-900">
              {title}
            </Heading>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
            >
              See more on Instagram
            </a>
          )}
        </header>

        <InstagramFeed limit={limit} />
      </div>
    </section>
  );
}
