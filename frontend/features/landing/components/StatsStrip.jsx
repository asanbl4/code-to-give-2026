const STATS = [
  { value: '500+', label: 'Families served' },
  { value: '800+', label: 'Sessions of classes and activities each month' },
  { value: '90+', label: 'Types of activities' },
  { value: '1000+', label: 'Volunteer hours per month' }
];

export default function StatsStrip() {
  return (
    <section className="stats-strip" aria-label="Community statistics">
      {STATS.map(stat => (
        <div key={stat.label} className="stat-card">
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}
