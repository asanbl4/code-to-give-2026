import { Button, Section } from "@/components/ui";
import { CircularGallery } from "@/components/vendor/CircularGallery";
import { STORIES } from "../data";

export function StoriesSection() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Section title="Real progress, real ability">
        <div className="h-[420px] w-full">
          <CircularGallery
            items={STORIES}
            bend={2}
            borderRadius={0.05}
            label="Gallery of Love 21 member stories. Use left and right arrow keys to navigate."
          />
        </div>

        <div className="mt-6">
          <Button href="/news-stories" variant="secondary">
            See all stories →
          </Button>
        </div>
      </Section>
    </div>
  );
}
