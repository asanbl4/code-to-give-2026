import CircularGallery from './CircularGallery';

// Real photos and titles pulled from Love 21's existing news/stories carousel.
// TODO: replace with live data from GET /api/participants once the
// feature/stories and feature/db branches are merged, for member-consented
// individual stories rather than press coverage.
const STORIES = [
  {
    image: 'https://love21foundation.com/wp-content/uploads/2026/05/bey0nd-limit_sz-1-1024x604.png',
    text: 'Beyond Limits Banquet'
  },
  {
    image: 'https://love21foundation.com/wp-content/uploads/2025/11/raffleinstagram_nologo-1024x1024.png',
    text: 'Charity Raffle 2025'
  },
  {
    image: 'https://love21foundation.com/wp-content/uploads/2022/06/Screenshot-2022-06-06-at-11.59.49-1024x684.png',
    text: "Love 21's Open Secret to a Long, Happy Life"
  },
  {
    image: 'https://love21foundation.com/wp-content/uploads/2022/06/Screenshot-2022-06-06-at-11.42.30-1024x638.png',
    text: 'Ready for Purposeful Employment'
  }
];

export default function StoriesSection() {
  return (
    <section className="stories-section">
      <h2 className="section-heading">Real progress, real ability</h2>
      <div className="stories-gallery-wrap">
        <CircularGallery items={STORIES} bend={2} textColor="#333333" borderRadius={0.05} />
      </div>
      <a href="/news-stories" className="stories-see-all">
        See all stories &rarr;
      </a>
    </section>
  );
}
