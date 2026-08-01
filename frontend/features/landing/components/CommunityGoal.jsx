export default function CommunityGoal({
  title = 'Help fund 20 sports sessions this month',
  raised = 7500,
  goal = 10000,
  sessionsSupported = 15
}) {
  const percent = Math.min(100, Math.round((raised / goal) * 100));

  return (
    <section className="community-goal">
      <h3>{title}</h3>
      <div className="community-goal-bar">
        <div className="community-goal-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="community-goal-meta">
        <span>
          HK${raised.toLocaleString()} raised of HK${goal.toLocaleString()} ({percent}%)
        </span>
        <span>{sessionsSupported} sessions supported</span>
      </div>
      <a href="/donate" className="community-goal-cta">
        Help complete the goal
      </a>
    </section>
  );
}
