import { Card, IconBadge } from "@/components/ui";

export function PrivacyAccountNote() {
  return (
    <Card as="section" panel padding="lg" aria-labelledby="privacy-account-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <IconBadge name="shieldInfo" tone="quiet" />
        <div>
          <h2 id="privacy-account-heading" className="font-display text-2xl font-bold text-ink">
            Privacy and account controls
          </h2>
          <p className="mt-3 leading-6 text-ink-soft">
            Real supporter profiles would require secure authentication, permission checks, and
            privacy-reviewed data handling before showing donation or volunteer records.
          </p>
          <p className="mt-2 leading-6 text-ink-soft">
            Account deletion, password management, notification settings, and privacy preferences
            can be managed securely from account settings.
          </p>
        </div>
      </div>
    </Card>
  );
}
