import { AnalyticsDashboard } from "@/features/analytics/components/AnalyticsDashboard";

export const metadata = {
  title: "Analytics",
};

/**
 * Inside the `(staff)` group, so it inherits the same gate as Members and
 * Group photos. The real boundary is still the API: `/api/admin/analytics/*`
 * verifies the token and re-reads the role from Postgres on every request.
 */
export default function AdminAnalyticsPage() {
  return <AnalyticsDashboard />;
}
