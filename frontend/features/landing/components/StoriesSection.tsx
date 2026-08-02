import { Button, Section } from "@/components/ui";
import { INSTAGRAM_PROFILE_URL } from "@/components/layout/navigation";
import { InstagramGallery } from "@/features/instagram/components/InstagramGallery";

export function StoriesSection() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Section
        title="Real progress, real ability"
        aside={
          INSTAGRAM_PROFILE_URL && (
            <Button
              href={INSTAGRAM_PROFILE_URL}
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit our Instagram
              {/* The carousel is a WebGL canvas, so its tiles cannot be clicked
                  through to Instagram — this is the only way out of it. Warning
                  about the new tab in text rather than relying on the icon
                  convention, which screen readers do not announce. */}
              <span className="sr-only"> (opens in a new tab)</span>
            </Button>
          )
        }
      >
        <InstagramGallery limit={12} />

        <div className="mt-6">
          <Button href="/news-stories" variant="secondary">
            See all stories →
          </Button>
        </div>
      </Section>
    </div>
  );
}
