export function PrivacyAccountNote() {
  return (
    <section
      aria-labelledby="privacy-account-heading"
      className="rounded-3xl border border-edge bg-paper/70 p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-deep text-ink">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="currentColor" d="M12 2 5 5v6c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5l-7-3Zm1 6v4h3v2h-5V8h2Z" />
          </svg>
        </span>
        <div>
          <h2 id="privacy-account-heading" className="text-lg font-semibold text-ink">
            Privacy and account controls
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Real supporter profiles would require secure authentication, permission checks,
            and privacy-reviewed data handling before showing donation or volunteer records.
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Account deletion, password management, notification settings, and privacy
            preferences can be managed securely from account settings.
          </p>
        </div>
      </div>
    </section>
  );
}
