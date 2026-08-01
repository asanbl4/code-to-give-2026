export function PrivacyAccountNote() {
  return (
    <section
      aria-labelledby="privacy-account-heading"
      className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="currentColor" d="M12 2 5 5v6c0 4.4 2.9 8.5 7 9.8 4.1-1.3 7-5.4 7-9.8V5l-7-3Zm1 6v4h3v2h-5V8h2Z" />
          </svg>
        </span>
        <div>
          <h2 id="privacy-account-heading" className="text-2xl font-semibold text-zinc-950">
            Privacy and account controls
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Real supporter profiles would require secure authentication, permission checks,
            and privacy-reviewed data handling before showing donation or volunteer records.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Account deletion, password management, notification settings, and privacy
            preferences can be managed securely from account settings.
          </p>
        </div>
      </div>
    </section>
  );
}
