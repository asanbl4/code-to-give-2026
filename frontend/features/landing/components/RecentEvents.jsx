// TODO: replace with live data once the Instagram auto-pull integration
// is ready. Kept fully independent from features/instagram for now.
// Using real recent post images from Love 21's site as placeholders.
const PLACEHOLDER_EVENTS = [
  {
    id: 1,
    caption: 'Beyond Limits Banquet — tables now open',
    image: 'https://love21foundation.com/wp-content/uploads/2026/05/bey0nd-limit_sz-1-1024x604.png'
  },
  {
    id: 2,
    caption: 'Charity Raffle 2025 — support the community',
    image: 'https://love21foundation.com/wp-content/uploads/2025/11/raffleinstagram_nologo-1024x1024.png'
  },
  {
    id: 3,
    caption: 'Health interview feature',
    image: 'https://love21foundation.com/wp-content/uploads/2022/06/Screenshot-2022-06-06-at-12.05.49-1024x575.png'
  }
];

export default function RecentEvents() {
  return (
    <section className="recent-events">
      <h2 className="section-heading">Recent activity</h2>
      <div className="recent-events-grid">
        {PLACEHOLDER_EVENTS.map(event => (
          <div
            key={event.id}
            className="recent-event-card"
            style={{ backgroundImage: `url(${event.image})` }}
          >
            <span className="recent-event-caption">{event.caption}</span>
          </div>
        ))}
      </div>
      <a href="/news-stories" className="recent-events-link">
        Read more
      </a>
    </section>
  );
}
