import { Section } from "@/components/ui";
import { InstagramFeed } from "./InstagramFeed";

interface InstagramSectionProps {
  title?: string;
  subtitle?: string;
  /** How many posts to show. */
  limit?: number;
  /** If set, renders a "See more on Instagram" link (e.g. the profile URL). */
  profileUrl?: string;
  /** Override the heading id — only needed if two sections share a title on one page. */
  id?: string;
  className?: string;
}

/**
 * Drop-in Instagram section: heading, container, and the feed grid.
 *
 *   <InstagramSection title="Latest from Instagram" limit={6} />
 *
 * The feed inside is a Server Component that fetches on the server, so this
 * works directly inside any page or layout with no extra wiring.
 */
export function InstagramSection({
  title = "Latest from Instagram",
  subtitle,
  limit = 12,
  profileUrl,
  id,
  className,
}: InstagramSectionProps) {
  return (
    <Section
      title={title}
      description={subtitle}
      id={id}
      className={className}
      aside={
        profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-signal underline underline-offset-2 hover:text-signal-deep"
          >
            See more on Instagram
          </a>
        )
      }
    >
      <InstagramFeed limit={limit} />
    </Section>
  );
}
