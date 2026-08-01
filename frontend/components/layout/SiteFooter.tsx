import Link from "next/link";
import { CONTACT_EMAIL, FOOTER_LINKS } from "./navigation";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-edge bg-surface">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 text-center sm:px-8">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="font-bold text-ink hover:text-signal">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-ink-soft">
          Contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-signal hover:text-signal-deep">
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          © {new Date().getFullYear()} Love 21 Foundation, Hong Kong
        </p>
      </div>
    </footer>
  );
}
